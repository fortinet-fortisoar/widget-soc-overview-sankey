/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
  'use strict';

  (function () {
      angular
          .module('cybersponse')
          .factory('socOverviewSankeyService', socOverviewSankeyService);
  
      socOverviewSankeyService.$inject = ['$q', '$http', 'currentDateMinusService', 'Query', 'API'];
  
      function socOverviewSankeyService($q, $http, currentDateMinusService, Query, API) {
          var service;
          var config;
  
          service = {
              getResourceAggregate: getResourceAggregate,
              loadJs: loadJs,
              getRandomDarkColor: getRandomDarkColor,
              fetchKeysWithPattern: fetchKeysWithPattern
          };
  
          // Load External JS Files
          function loadJs(filePath) {
              var fileLoadDefer = $q.defer();
              var script = document.createElement('script');
              script.type = 'text/javascript';
              script.src = filePath;
              document.getElementsByTagName('head')[0].appendChild(script);
              script.onload = function () {
                  fileLoadDefer.resolve();
              }
              return fileLoadDefer.promise;
          }
  
          //API payload
          function getResourceAggregate(_config, _duration) {
              config = _config;
              var duration = _duration;
              var recordSize = config.recordSize;
              var defer = $q.defer();
              var dataFilters = getFilters(duration);
              var queryObject = {
                  sort: [{
                      field: 'total',
                      direction: 'DESC'
                  }],
                  aggregates: [
                      {
                          'operator': 'count',
                          'field': '*',
                          'alias': 'total'
                      }
                  ],
                  relationship: true,
                  filters: [dataFilters]
              };
              var elementIndex = 0;
              var _resource = config.resource;
              var _allQuery = [];
              var previousLayer = null;
              for (var i = 0; i < config.layers.length; i++) {
                  var queryObject = {
                      sort: [{
                          field: 'total',
                          direction: 'DESC'
                      }],
                      aggregates: [
                          {
                              'operator': 'count',
                              'field': '*',
                              'alias': 'total'
                          }
                      ],
                      relationship: true,
                      filters: [dataFilters]
                  };
                  let currentLayer = config.layers[i];
                  //if - else to check if it is the 1st layer or not
                  if (currentLayer['sourceNodesField'] && currentLayer['sourceNodesField'] !== '') {
                      queryObject.aggregates.push({
                          'operator': 'groupby',
                          'alias': 'series_' + elementIndex,
                          'field': config['sourceNodeType'] === 'picklist' ? currentLayer['sourceNodesField'] + '.itemValue' : currentLayer['sourceNodesField'] // picklist check added in source node 
                      });
                      if (currentLayer['targetNodeSubField'] === null) {
                          elementIndex++;
                          pushTargetNodes(queryObject, elementIndex, currentLayer);
                      } else {
                          elementIndex++;
                          pushTargetSubNodes(queryObject, elementIndex, currentLayer);
                      }
                  }
                  else {
                      //if the layers are other than 1st layer than API call need to be made as per the target node type of previous layer
                      if (previousLayer) {
                          //update resource for the next layers
                          if (previousLayer['targetNodeType'] === 'manyToMany') {
                              _resource = previousLayer['targetNodeModule'];
                          }
                          let _fieldCondition = getSubTargetFieldCondition(_resource,previousLayer);
                          //if targetSubfield is not null then use targetNodeSubfield 
                          //else use target node
                          if (previousLayer['targetNodeSubField'] !== null) {
                              queryObject.aggregates.push({
                                  'operator': 'groupby',
                                  'alias': 'series_' + elementIndex,
                                  'field': previousLayer['targetNodeSubType'] === 'picklist' ? previousLayer['targetNodeSubField'] + '.itemValue' : previousLayer['targetNodeSubField']
                              });
                          }
                          else {
                              pushTargetNodes(queryObject, elementIndex, previousLayer, _resource);
                          }
                      }
                      elementIndex++;
                      if (currentLayer['targetNodeSubField'] === null) {
                          pushTargetNodes(queryObject, elementIndex, currentLayer, _resource);
                      } else {
                          pushTargetSubNodes(queryObject, elementIndex, currentLayer, _resource);
                      }
                  }
  
                  var _queryObj = new Query(queryObject);
                  _allQuery.push(
                      $http.post(API.QUERY + _resource + '?$limit=' + recordSize, _queryObj.getQuery(true)).then(function (response) {
                          return response;
                          //defer.resolve(response.data);
                      }, function (error) {
                          // defer.reject(error);
                      })
                  )
                  previousLayer = currentLayer;
              }
              $q.all(_allQuery).then(function (response) {
                  defer.resolve(response);
                  //console.log(response)
              })
              return defer.promise;
  
          }
  
          // push target nodes if target node is selected and doesnt have sub field selected
          function pushTargetNodes(queryObject, elementIndex, currentLayer, _resource) {
              queryObject.aggregates.push({
                  'operator': 'groupby',
                  'alias': 'series_' + elementIndex,
                  'field': currentLayer['targetNodeType'] === 'picklist'? currentLayer['targetNodeField'] + '.itemValue' : currentLayer['targetNodeField']
              });
              if (currentLayer['targetNodeType'] === 'picklist') {
                  queryObject.aggregates.push({
                      'operator': 'groupby',
                      'alias': 'color_series_' + elementIndex,
                      'field': currentLayer['targetNodeField'] + '.color'
                  });
              }
          }
  
          // push sub target nodes if target node is manyToMany and sub field is selected
          function pushTargetSubNodes(queryObject, elementIndex, currentLayer, _resource) {
              let _fieldCondition = getSubTargetFieldCondition(_resource,currentLayer);
              queryObject.aggregates.push({
                  'operator': 'groupby',
                  'alias': 'series_' + elementIndex,
                  'field': _fieldCondition
              });
              if (currentLayer['targetNodeSubType'] === 'picklist') {
                  queryObject.aggregates.push({
                      'operator': 'groupby',
                      'alias': 'color_series_' + elementIndex,
                      'field': currentLayer['targetNodeField'] + '.' + currentLayer['targetNodeSubField'] + '.color'
                  });
              }
          }
  
          //the condition of field is updated if the resource selected on each layer is different or similar
          function getSubTargetFieldCondition(_resource, currentLayer) {
              let _fieldCondition = currentLayer['targetNodeSubField'];
              if(currentLayer['targetNodeSubType'] === 'picklist')
              {
                  if(!_resource || _resource === currentLayer['targetNodeModule']){
                      _fieldCondition = currentLayer['targetNodeSubField'] + '.itemValue';
                  }
                  else{
                      _fieldCondition = currentLayer['targetNodeField'] + '.' + currentLayer['targetNodeSubField'] + '.itemValue';
                  }  
              }    
              else{
                  if(_resource !== currentLayer['targetNodeModule']){
                      _fieldCondition = currentLayer['targetNodeField'] + '.' + currentLayer['targetNodeSubField'];
                  }
              }
              return _fieldCondition;
          }
  
  
          function getFilters(duration) {
              let frontFilter = {};
              frontFilter.logic = 'AND';
              if (config.entityTrackable) {
                  frontFilter.filters = [{
                      field: 'createDate',
                      operator: 'gte',
                      value: currentDateMinusService(duration),
                      type: 'datetime'
                  }];
              }
  
              let dataFilters = config.query.filters ? angular.copy(config.query.filters) : {};
              if (dataFilters.filters) {
                  dataFilters.filters.push(frontFilter);
              } else {
                  dataFilters = frontFilter;
              }
              return dataFilters;
          }
  
          //create random colors for nodes and links if the picklist/field has no color assigned
          function getRandomDarkColor() {
              var red = Math.floor(Math.random() * 256); // Random value for red channel (0-255)
              var green = Math.floor(Math.random() * 256); // Random value for green channel (0-255)
              var blue = Math.floor(Math.random() * 256); // Random value for blue channel (0-255)
  
              // Ensure at least one channel is bright enough (above 150)
              while (red < 150 && green < 150 && blue < 150) {
                  red = Math.floor(Math.random() * 256);
                  green = Math.floor(Math.random() * 256);
                  blue = Math.floor(Math.random() * 256);
              }
              return 'rgb(' + red + ', ' + green + ', ' + blue + ')';
          }
  
          //return array with specified pattern(series_)
          function fetchKeysWithPattern(array, pattern) {
              let keys = new Set(); // Using Set to ensure unique keys
              // Iterate over each object in the array
              array.forEach(obj => {
                  // Get the keys of the current object
                  let objKeys = Object.keys(obj);
                  // Filter keys based on the pattern
                  let filteredKeys = objKeys.filter(key => key.startsWith(pattern));
                  // Add filtered keys to the Set
                  filteredKeys.forEach(key => {
                      keys.add(key);
                  });
              });
  
              // Convert Set to array and return
              return Array.from(keys);
          }
  
          return service;
      }
  })();
  