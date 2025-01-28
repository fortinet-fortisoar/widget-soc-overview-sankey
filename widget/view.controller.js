/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
  'use strict';
  (function () {
    angular
      .module('cybersponse')
      .controller('socOverviewSankey211Ctrl', socOverviewSankey211Ctrl);
  
    socOverviewSankey211Ctrl.$inject = ['$scope', '$rootScope', 'config', '_', 'PagedCollection', 'widgetUtilityService', 'socOverviewSankeyService'];
  
    function socOverviewSankey211Ctrl($scope, $rootScope, config, _, PagedCollection, widgetUtilityService, socOverviewSankeyService) {
  
      var sankey;
      var chartData = {};
      var nodes = [];
      var links = [];
      var nodesMap = [];
      var nodeColorMap = [];
      var backgroundArea = [];
      var errorMessage = '';
      var _seriesNo = 0;
      var _linkNo = 0;
      var _linkId = 0;
      var dataToPlot = [];
      var idIndex = 0;
      $scope.config = config;
      $scope.moduleType = $scope.config.moduleType;
      $scope.processing = false;
      $scope.duration = 90;	// Default duration
      $scope.config.buttons = [{
        id: 'btn-6m',
        text: 'BUTTON_LAST_6_MONTHS',
        onClick: function () {
          refreshSankey(90, 'btn-6m');
        },
        active: true,
        type: 'submit'
      }, {
        id: 'btn-3m',
        text: 'BUTTON_LAST_3_MONTHS',
        onClick: function () {
          refreshSankey(60, 'btn-3m');
        },
        active: false,
        type: 'submit'
      }, {
        id: 'btn-30d',
        text: 'BUTTON_LAST_30_DAYS',
        onClick: function () {
          refreshSankey(30, 'btn-30d');
        },
        active: false,
        type: 'submit'
      }];
  
      function _init() {
        $scope.processing = true;
        _handleTranslations();
        let loader = window.AMDLoader; // copied the amd loader properties 
        let define = window.define;
        window.AMDLoader = {};
        window.define = {};
        socOverviewSankeyService.loadJs('https://cdnjs.cloudflare.com/ajax/libs/d3-sankey/0.12.3/d3-sankey.min.js').then(function () {
          if ($scope.config.moduleType === 'Across Modules') { //across module to fetch live data
            refreshSankey(90, 'btn-6m');
          }
          else {
            cleanChartData();
            populateCustomData();
          }
          //assigned the loader properties for amd loader once the d3-sankey.min.js is loaded 
          $timeout(function(){
            window.AMDLoader = loader;
            window.define = define;
          },5000)
        });
      }
  
      // to clear the chart nodes, links and data values
      function cleanChartData() {
        nodes = [];
        links = [];
        chartData = {};
        nodeColorMap = [];
        nodesMap = [];
        
      }
  
      // Refresh Sankey Chart
      function refreshSankey(duration, id) {
        $scope.duration = duration;
        // Handling button active property
        $scope.config.buttons.forEach(button => {
          if (button.id === id) {
            button.active = true;
          } else {
            button.active = false;
          }
        });
        cleanChartData();
        if ($scope.config.moduleType === 'Across Modules') {
          fetchData();
        }
        else {
          populateCustomData();
        }
      }
  
      //fetch live data
      function fetchData() {
        socOverviewSankeyService.getResourceAggregate($scope.config, $scope.duration).then(function (result) {
          _linkId = 0;
          if (result) {
            for (var i in result) {
              _seriesNo = i;
              _linkNo = i;
              if(result[i]['data'] && result[i]['data']['hydra:member']){
                if(result[i]['data']['hydra:member'].length === 0){
                  errorMessage = $scope.viewWidgetVars.MESSAGE_NO_RECORDS_FOUND;
                  renderNoRecordMessage();
                }
                else{
                  createDataToPlot(result[i]['data']['hydra:member']);
                }
              }
            }
            onCompleteRender();
          } else {
            errorMessage = $scope.viewWidgetVars.MESSAGE_NO_RECORDS_FOUND;
            renderNoRecordMessage();
          }
        }, function () {
          errorMessage = $scope.viewWidgetVars.MESSAGE_NO_RECORDS_FOUND;
          renderNoRecordMessage();
        }).finally(function () {
          $scope.processing = false;
        });
      }
  
      //to populate data for custom module
      function populateCustomData() {
        var filters = {
          query: $scope.config.query
        };
        var pagedTotalData = new PagedCollection($scope.config.customModule, null, null);
        pagedTotalData.loadByPost(filters).then(function () {
          if (pagedTotalData.fieldRows.length === 0) {
            errorMessage = $scope.viewWidgetVars.MESSAGE_NO_RECORDS_FOUND;
            renderNoRecordMessage();
            $scope.processing = false;
            return;
          }
          var data = pagedTotalData.fieldRows[0][$scope.config.customModuleField].value;
          if (!data) {
            data = {};
          } else {
            $scope.processing = false;
            chartData = data;
            staticDataToPlot();
          }
        })
      }
  
      //create data by merging the API response of each module - for live data
      function createDataToPlot(_data) {
        let seriesArray = [];
        let seriesNameArray = [];
        backgroundArea = [];
        var replacedArray = _.map(_data, function (obj) {
          return _.mapObject(obj, function (value, key) {
            return value === null ? "NA" : value;
          });
        });
        dataToPlot = replacedArray;
        seriesNameArray = socOverviewSankeyService.fetchKeysWithPattern(dataToPlot, "series_");
        _seriesNo = seriesNameArray[0].split('series_')[1];
        for (var i = 0; i < seriesNameArray.length; i++) {
          seriesArray.push(_.filter(_.map(dataToPlot, item => item[seriesNameArray[i]]), (item, index, arr) => item !== null && arr.indexOf(item) == index));
        };
        // create nodes data as per the series of data
        // create nodeMap data as per the series of data which will be used further to create link data
        seriesArray.forEach((element, s) => {
          element.forEach((node, i) => {
            let isPresent = nodesMap.some(obj => obj.name === node + '_' + _seriesNo);
            if (!isPresent) {
              nodesMap.push({
                'name': node + '_' + _seriesNo,
                'idIndex': idIndex
              });
              nodes.push({
                "name": node,
                "id": idIndex++
              });
            }
          });
          _seriesNo++;
        })
  
        //create nodeColorMap to create set of colors for related nodes 
        dataToPlot.forEach((item, index) => {
          for (let c = 0; c < seriesNameArray.length; c++) {
            if (item['color_' + seriesNameArray[c]] !== undefined && item['color_' + seriesNameArray[c]] !== 'NA') {
              nodeColorMap[item[seriesNameArray[c]]] = item['color_' + seriesNameArray[c]]; //add picklist color to nodes and links
            }
            else {
              nodeColorMap[item[seriesNameArray[c]]] = socOverviewSankeyService.getRandomDarkColor(); //if picklist has no color get random color
            }
          }
        });
        nodes.forEach(node => {
          if (nodeColorMap[node.name]) {
            node['color'] = nodeColorMap[node.name];
          }
        });
        const additionalId = 2200000000; // to create additional id for null values
        // create nodes and links data as per the dynamic series generated data
        dataToPlot.forEach((link) => {
          for (let c = 0; c < seriesNameArray.length; c++) {
            if (link[seriesNameArray[c]] && link[seriesNameArray[c + 1]]) {
              let _currentSource = _.filter(nodesMap, { 'name': link[seriesNameArray[c]] + '_' + _linkNo })[0]['idIndex'];
              let _currentTarget = _.filter(nodesMap, { 'name': link[seriesNameArray[c + 1]] + '_' + (Number(_linkNo) + 1) })[0]['idIndex'];

              //check if current node source id is present in target id to avoid the shifting of nodes to extreme left
              if (Number(_linkNo) !== 0) {
                let targetPresent = _.filter(links, function (_data) {
                  return _data.target === _currentSource;
                });
                if (targetPresent.length === 0) {
                  links.push({
                    "source": additionalId + Number(_linkNo),
                    "target": _currentSource,
                    "value": 0,
                    "id": _linkId
                  });
                  if (Number(_linkNo) > 1) {
                    for (var l = 0; l < Number(_linkNo); l++) {
                      links.push({
                        "source": additionalId + (Number(_linkNo) - 1),
                        "target": additionalId + Number(_linkNo),
                        "value": 0,
                        "id": _linkId
                      });
                      nodes.push({
                        "name": 'NA',
                        "id": additionalId + Number(_linkNo)
                      });
                    }
                  }
                  else {
                    nodes.push({
                      "name": 'NA',
                      "id": additionalId + Number(_linkNo)
                    });
                  }
                }
              }
              //create link data with source,target and value
              // add value as 0 if source or target has NA(null) values
              let linkData = {
                "source": _currentSource,
                "target": _currentTarget,
                "value": (link[seriesNameArray[c]]) === "NA" || (link[seriesNameArray[c + 1]]) === "NA" ? 0 : link.total,
                "id": _linkId
              };
              if (nodeColorMap[link[seriesNameArray[c]]]) {
                linkData['color'] = nodeColorMap[link[seriesNameArray[c + 1]]];
              }
              links.push(linkData);
              _linkId++;
            }
          }
        });
      }
  
      //create data from keystore value -  for static data selection
      function staticDataToPlot() {
        if (chartData) {
          let _id = 0
          for (var i in chartData) {
            _seriesNo = _id;
            _linkNo = _id;
            if(chartData[i]){
              createDataToPlot(chartData[i]);
            }
            _id++;
          }
          onCompleteRender();
        } else {
          errorMessage = $scope.viewWidgetVars.MESSAGE_NO_RECORDS_FOUND;
          renderNoRecordMessage();
        }
      }
      //call render when the data formation of nodes and links of all api is completed 
      function onCompleteRender() {
        if ($scope.config.moduleType === 'Across Modules') {
          for (var l in $scope.config.layers) {
            if ($scope.config.layers[l]) {
              backgroundArea.push({ 'label': $scope.config.layers[l]['label'] });
            }
          }
        }
        else {
          if(chartData){
            let _staticDataLength = Object.keys(chartData).length;
            for(var i= 0; i < _staticDataLength; i++){
              backgroundArea.push({ 'label': 'series_'+i });
            }
          }
        }
  
        if (nodes.length > 0 && links.length > 0 &&  (socOverviewSankeyService.hasNonZeroValue(links))) {
          chartData.nodes = nodes;
          chartData.links = links;
          renderSankeyChart();
        } else {
          errorMessage = $scope.viewWidgetVars.MESSAGE_NO_NODES_LINKS;
          renderNoRecordMessage()
        }
      }
      
  
      //draw Sankey using d3
      function renderSankeyChart() {
        const width = angular.element(document.querySelector('#sankeyChart-' + $scope.config.wid))[0].clientWidth;
        const height = width > 1000 ? 800 : 600;
        var xPoint = 80;
        const noOfLinksColumn = backgroundArea.length;
        const rectWidth = (width - (xPoint + (12 * noOfLinksColumn))) / noOfLinksColumn;
        const gradientLeft = $rootScope.theme.id === 'light' ? '#ffffff' : 'grey';
        const gradientRight = $rootScope.theme.id === 'light' ? '#bbbbbb' : 'black'; // #bbbbbb
        const backgroundStroke = $rootScope.theme.id === 'light' ? '#bbbbbb' : '#808080';
        const backgroundTitle = $rootScope.theme.id === 'light' ? '#000000' : 'grey';
        const textColor = $rootScope.theme.id === 'light' ? '#000000' : '#ffffff';
        let backgroundRect = [];
  
        //array to draw rectangular background
        backgroundArea.forEach(function (element, index) {
          if (index > 0) {
            xPoint = xPoint + (rectWidth) + (12);
          }
          backgroundRect.push({
            'name': element.label,
            'xPoint': xPoint,
            'index': index,
            'width': rectWidth
          });
        });
  
        sankey = d3.sankey()
          .nodeSort((a, b) => a.id - b.id)
          .nodeId(d => d.id)
          .linkSort(null)
          .nodeAlign(d3.sankeyLeft) // Align node to the left, default is d3.sankeyJustify. Nodes without any outgoing links are moved as left as possible.
          .nodeWidth(12)
          .nodePadding(10)
          .extent([[68, 70], [width, height - 20]]);
  
        d3.select('#sankeyChart-' + $scope.config.wid).selectAll('svg').remove();
        const svg = d3.selectAll('#sankeyChart-' + $scope.config.wid)
          .append('svg')
          .attr("width", width)
          .attr("height", height)
          .attr("viewBox", [0, 0, width, height + 20])
          .on('mouseout', () => {
            d3.selectAll(`path`)
              .attr('stroke-opacity', 0.4); // 0.4
          });
  
        const { nodes, links } = sankey({
          nodes: chartData.nodes.map(d => Object.assign({}, d)),
          links: chartData.links.map(d => Object.assign({}, d))
        });
  
        // Gradient Color for fill
        var defs = svg.append('defs');
  
        var gradient = defs.append('linearGradient')
          .attr('id', 'svgGradient')
          .attr('x1', '0%')
          .attr('x2', '100%')
          .attr('y1', '0%')
          .attr('y2', '0%');
  
        gradient.append('stop')
          .attr('class', 'start')
          .attr('offset', '0%')
          .attr('stop-color', gradientLeft)
          .attr('stop-opacity', 1);
  
        gradient.append('stop')
          .attr('class', 'end')
          .attr('offset', '100%')
          .attr('stop-color', gradientRight)
          .attr('stop-opacity', 1);
  
        // If color is not provided as a part of data, then scale will be used
        var colorScale = d3.scaleLinear()
          .domain([0, chartData.nodes.length])
          .range(['#00B9FA', '#F95002'])
          .interpolate(d3.interpolateHcl);
  
        // Rendering Background Rectangles with gradient
        const backRect = svg.append("g")
          .selectAll("rect")
          .data(backgroundRect)
          .enter();
  
        backRect.append("rect")
          .attr("x", d => d.xPoint ? d.xPoint : (150 + (d.index * 12) + ((d.index - 1) * rectWidth)))
          .attr("y", 0)
          .attr("rx", 3)
          .attr("ry", 3)
          .attr("width", d => d.width ? d.width : rectWidth)
          .attr("height", height)
          .attr("fill", "url(#svgGradient)")
          .attr("fill-opacity", 0.6)
          .attr('stroke', backgroundStroke)
          .append("title")
          .text(d => `${d.name}`);
  
        backRect.append('text')
          .attr("x", d => {
            if (d.xPoint) {
              return (d.xPoint + (d.width / 2));
            } else {
              return ((150 + (d.index * 12) + ((d.index - 1) * rectWidth)) + (rectWidth / 2));
            }
          })
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .attr("font-variant", "all-small-caps")
          .attr("fill", backgroundTitle)
          .text(d => d.name);
  
        // Rendering Nodes
        // hidden class added to nodes with name 'NA' and value 0 as we don't want to render nodes with null values
        svg.append("g")
          .selectAll("rect")
          .data(nodes)
          .enter().append("rect")
          .attr("x", d => d.x0)
          .attr("y", d => d.y0)
          .attr("height", d => d.y1 - d.y0)
          .attr("width", d => d.x1 - d.x0)
          .attr("class", d => {
            if (d.name === "NA") {
              return "hidden" 
            }
          })
          .attr("class", d => {
            if (d.value === 0) {
              return "hidden"
            }
          })
          .attr('stroke', '#808080')
          .attr("fill", d => {
            if (d.color) {
              return d.color;
            } else {
              for (var i = 0; i < chartData.nodes.length; i++) {
                if (d.name === chartData.nodes[i].name) {
                  return d3.rgb(colorScale(i));
                }
              }
            }
          })
          .on('mouseover', (d) => {
            d.sourceLinks.forEach(e => {
              d3.selectAll(`path.trajectory_${e.id}`)
                .attr('stroke-opacity', 0.8); // 0.8
            });
  
            d.targetLinks.forEach(e => {
              d3.selectAll(`path.trajectory_${e.id}`)
                .attr('stroke-opacity', 0.8); // 0.8
            });
          })
          .on('mouseout', d => {
            d.sourceLinks.forEach(e => {
              d3.selectAll(`path.trajectory_${e.id}`)
                .attr('stroke-opacity', 0.4); // 0.4
            })
          })
          .append("title")
          .attr("class", d => {
            if (d.name === "NA") {
              return "hidden"
            }
          })
          .text(d => `${d.name}: ${d.value}`);
  
  
        // Rendering Links
        // hidden class added to links with name 'NA' and value 0 as we don't want to render links connected to null values
        const link = svg.append("g")
          .attr("fill", "none")
          .attr("stroke-opacity", 1) // 0.8
          .selectAll("g")
          .data(links)
          .enter().append('g')
          .attr("class", d => {
            if (d.source.name === "NA" || d.target.name === "NA") {
              return "hidden"
            }
          });
  
        link.append("path")
          .attr('class', d => `trajectory_${d.id}`)
          .attr("d", d3.sankeyLinkHorizontal())
          .attr("stroke", d => d.color ? d.color : d3.schemeSet1[4])
          .attr('stroke-opacity', 0.4) // 0.2
          .attr("stroke-width", d => Math.max(1, d.width));
  
        link.append("title")
          .text(d => `${d.source.name} → ${d.target.name}\n${d.value}`);
  
        // Node text and value rendering
        // hidden class added to text with name 'NA' and value 0 as we don't want to render text for null values
        svg.append("g")
          .style("font", "11px sans-serif")
          .selectAll("text")
          .data(nodes)
          .enter().append("foreignObject")
          .attr("class", d => {
            if (d.name === "NA") {
              return "hidden"
            }
          })
          .attr("class", d => {
            if (d.value === 0) { //hide node if value is 0
              return "hidden"
            }
          })
          .attr("x", function (d) {
            if (d.layer === 0) { //to adjust the node text x position as per layer of nodes
              return d.x0 - 88
            }
            else {
              return d.x0 - 108
            }
          })//("x", d => d.x0 - 58) // d.x0 - 6)// 
          .attr("y", d => (d.y0 + d.y1) / 2)
          .attr("width", function (d) {
            if (d.layer === 0) {  //to adjust the node text width as per layer of nodes
              return 80
            }
            else {
              return 100
            }
          })
          .attr("height", 50)
          .append("xhtml:div") //add node names
          .attr("class", "truncate padding-left-6")//"truncate padding-left-6")
          .style("width", "80")
          .style("height", "20")
          .style("color", textColor)
          .style("text-align", "right")
          .text(d => { return d.name })
          .attr("title", d => d.name)
          .append("xhtml:div") // add node values
          .attr("x", d => d.x0) // d.x0 - 6)// 
          .attr("dy", 12)
          .style("width", "80")
          .style("height", "20")
          .style("color", textColor)
          .attr('font-size', '9px sans-serif')
          .attr("title", d => d.value)
          .style("text-align", "right")
          .text(d => d.value)
      }
  
      //render text if no data found or nodes and links are not formed by the fetched data
      function renderNoRecordMessage() {
        const width = angular.element(document.querySelector('#sankeyChart-' + $scope.config.wid))[0].clientWidth;
        const height = 50;
        const backgroundColor = $rootScope.theme.id === 'light' ? '#f2f2f3' : $rootScope.theme.id === 'dark' ? '#1d1d1d' : '#212c3a';
        const textColor = $rootScope.theme.id === 'light' ? '#000000' : '#ffffff';
        const strokeColor = $rootScope.theme.id === 'light' ? '#e4e4e4' : '#000000';
        d3.select('#sankeyChart-' + $scope.config.wid).selectAll('svg').remove();
  
        const svg = d3.selectAll('#sankeyChart-' + $scope.config.wid)
          .append('svg')
          .attr('width', width)
          .attr('height', height);
  
        // Display message and return if no records found
        svg.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('rx', 4)
          .attr('width', width)
          .attr('height', height)
          .attr('stroke', strokeColor)
          .attr('fill', backgroundColor);
  
        svg.append('text')
          .text(errorMessage)
          .attr('x', 20)
          .attr('y', 30)
          .attr('font-size', 16)
          .attr('text-anchor', 'start')
          .attr('text-height', 20)
          .attr('fill', textColor);
      }
  
      //to handle i18n 
      function _handleTranslations() {
        widgetUtilityService.checkTranslationMode($scope.$parent.model.type).then(function () {
          $scope.viewWidgetVars = {
            // Create your translating static string variables here
            BUTTON_LAST_6_MONTHS: widgetUtilityService.translate('socOverviewSankey.BUTTON_LAST_6_MONTHS'),
            BUTTON_LAST_3_MONTHS: widgetUtilityService.translate('socOverviewSankey.BUTTON_LAST_3_MONTHS'),
            BUTTON_LAST_30_DAYS: widgetUtilityService.translate('socOverviewSankey.BUTTON_LAST_30_DAYS'),
            MESSAGE_NO_RECORDS_FOUND: widgetUtilityService.translate('socOverviewSankey.MESSAGE_NO_RECORDS_FOUND'),
            MESSAGE_NO_NODES_LINKS: widgetUtilityService.translate('socOverviewSankey.MESSAGE_NO_NODES_LINKS')
          };
        });
      }
  
      _init();
    }
  })();
  