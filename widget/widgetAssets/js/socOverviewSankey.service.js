/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
  'use strict';

  (function () {
      angular
          .module('cybersponse')
          .factory('socOverviewSankeyService', socOverviewSankeyService);
  
      socOverviewSankeyService.$inject = ['$q', '$http', 'currentDateMinusService', 'Query', 'API', 'Entity'];
  
      function socOverviewSankeyService($q, $http, currentDateMinusService, Query, API, Entity) {
          var service;
          var config;
  
          service = {
              getResourceAggregate: getResourceAggregate,
              loadJs: loadJs,
              getRandomDarkColor: getRandomDarkColor,
              fetchKeysWithPattern: fetchKeysWithPattern,
              hasNonZeroValue: hasNonZeroValue
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
              var elementIndex = 0;
              var _resource = config.resource;
              var _allQuery = [];
              var previousLayer = null;
              for (var id = 0; id < config.layers.length; id++) {
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
                      relationship: true
                  };
                  let currentLayer = config.layers[id];
                  _resource = currentLayer['sourceNodeModule'];
                  //create aggregate for source
                  if (currentLayer['sourceNodeModule']) {
                      queryObject.aggregates.push({
                          'operator': 'groupby',
                          'alias': 'series_' + id,
                          'field': currentLayer['sourceNodeType'] === 'picklist' ? currentLayer['sourceNode'] + '.itemValue' : currentLayer['sourceNode'] // picklist check added in source node 
                      });
                      elementIndex++;
                  }
                  //create aggregate for target
                  if (currentLayer['targetNodeField'] === null) {
                      pushTarget(queryObject, elementIndex, currentLayer);
                  }
                  else {
                      pushTargetField(queryObject, elementIndex, currentLayer);
                  }
  
                  var dataFilters = getFilters(duration, _resource);
                  queryObject["filters"] = [dataFilters];
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
          function pushTarget(queryObject, elementIndex, currentLayer) {
              queryObject.aggregates.push({
                  'operator': 'groupby',
                  'alias': 'series_' + elementIndex,
                  'field': currentLayer['targetNodeType'] === 'picklist' ? currentLayer['targetNode'] + '.itemValue' : currentLayer['targetNode']
              });
              if (currentLayer['targetNodeType'] === 'picklist') {
                  queryObject.aggregates.push({
                      'operator': 'groupby',
                      'alias': 'color_series_' + elementIndex,
                      'field': currentLayer['targetNode'] + '.color'
                  });
              }
          }
  
          // push sub target nodes if target node is manyToMany and sub field is selected
          function pushTargetField(queryObject, elementIndex, currentLayer) {
              queryObject.aggregates.push({
                  'operator': 'groupby',
                  'alias': 'series_' + elementIndex,
                  'field': currentLayer['targetNodeFieldType'] === 'picklist' ? currentLayer['targetNode'] + '.' + currentLayer['targetNodeField'] + '.itemValue' : currentLayer['targetNode'] + '.' + currentLayer['targetNodeField']
              });
              if (currentLayer['targetNodeFieldType'] === 'picklist') {
                  queryObject.aggregates.push({
                      'operator': 'groupby',
                      'alias': 'color_series_' + elementIndex,
                      'field': currentLayer['targetNode'] + '.' + currentLayer['targetNodeField'] + '.color'
                  });
              }
          }
  
          function getFilters(duration, _resource) {
              let frontFilter = {};
              frontFilter.logic = 'AND';
              let isEntityTrackable = checkIfEntityIsTrackable(_resource);
              if (isEntityTrackable) {
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
  
          function checkIfEntityIsTrackable(_entity) {
              var isTrackable = false;
              var entity = new Entity(_entity);
              entity.loadFields().then(function () {
                  isTrackable = entity.trackable;
              });
              return isTrackable;
          }
  
          // Function to check if any value in the array is not zero
          function hasNonZeroValue(arr) {
              return arr.some(obj => obj.value !== 0);
          }
          return service;
      }
  })();
  