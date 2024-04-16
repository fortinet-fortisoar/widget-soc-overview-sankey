/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
  'use strict';
  (function () {
    angular
      .module('cybersponse')
      .controller('editSocOverviewSankey210Ctrl', editSocOverviewSankey210Ctrl);
  
    editSocOverviewSankey210Ctrl.$inject = ['$scope', '$uibModalInstance', 'config', 'appModulesService', 'Entity', 'modelMetadatasService', 'widgetUtilityService', '$timeout', '$filter', 'ALL_RECORDS_SIZE'];
  
    function editSocOverviewSankey210Ctrl($scope, $uibModalInstance, config, appModulesService, Entity, modelMetadatasService, widgetUtilityService, $timeout, $filter, ALL_RECORDS_SIZE) {
      $scope.cancel = cancel;
      $scope.save = save;
      $scope.config = config;
      $scope.params = {};
      $scope.jsonObjModuleList = [];
      $scope.loadAttributesForCustomModule = loadAttributesForCustomModule;
      $scope.onChangeModuleType = onChangeModuleType;
      $scope.fetchAttributes = fetchAttributes;
      $scope.changeAttribute = changeAttribute;
      $scope.config.moduleType = $scope.config.moduleType ? $scope.config.moduleType : 'Across Modules';
      $scope.addLayer = addLayer;
      $scope.removeLayer = removeLayer;
      $scope.checkTargetType = checkTargetType;
      $scope.onChangeTarget = onChangeTarget;
      $scope.addSubTargetType = addSubTargetType;
      $scope.config.entityTrackable = true;
      $scope.config.layers = $scope.config.layers || [];
      $scope.maxlayers = false;
      //to fetch no of records in API response
      $scope.recordSize = [{
        'name':'30', 
        'value':30
      },{
        'name':'ALL RECORDS', 
        'value':ALL_RECORDS_SIZE
      }];
      if ($scope.config.layers.length === 0) {
         insertLayerObject();
      }
      else if ($scope.config.layers.length >= 3) {
        $scope.maxlayers = true;
      }
  
      if ($scope.config.customModule) {
        $scope.loadAttributesForCustomModule();
      }
  
      function loadAttributesForCustomModule() {
        $scope.fields = [];
        $scope.fieldsArray = [];
        $scope.objectFields = [];
        var entity = new Entity($scope.config.customModule);
        entity.loadFields().then(function () {
          for (var key in entity.fields) {
            //filtering out JSON fields 
            if (entity.fields[key].type === "object") {
              $scope.objectFields.push(entity.fields[key]);
            }
          }
          $scope.fields = entity.getFormFields();
          angular.extend($scope.fields, entity.getRelationshipFields());
          $scope.fieldsArray = entity.getFormFieldsArray();
        });
      }
  
      function onChangeModuleType() {
        delete $scope.config.query;
        delete $scope.config.customModuleField;
        delete $scope.config.customModule;
      }
  
      function loadModules() {
        appModulesService.load(true).then(function (modules) {
          $scope.modules = modules;
          
          //Create a list of modules with atleast one JSON field
          $scope.modules.forEach((module) => {
            var moduleMetaData = modelMetadatasService.getMetadataByModuleType(module.type);
            for (let fieldIndex = 0; fieldIndex < moduleMetaData.attributes.length; fieldIndex++) {
              //Check If JSON field is present in the module
              if (moduleMetaData.attributes[fieldIndex].type === "object") {
                $scope.jsonObjModuleList.push(module);
                break;
              }
            }
          });
        });
        if ($scope.config.resource) {
          $scope.fetchAttributes();
        }
      }
  
      // fetch attributes when there is change in module selection
      function changeAttribute() {
        $scope.config.layers = [];
        insertLayerObject();
        fetchAttributes();
      }
  
      //insert empty layer object
      function  insertLayerObject(){
        $scope.config.layers.push({
          label: null,
          resource: null,
          sourceNodesField: null,
          targetNodeField: null,
          targetNodeSubField: null,
          targetNodeType: null,
          targetNodeSubType: null,
          targetNodeModule: null
        });
      }
  
      //fetch module related attributes
      function fetchAttributes() {
        var entity = new Entity($scope.config.resource);
        entity.loadFields().then(function () {
          $scope.config.entityTrackable = entity.trackable;
          $scope.config.entityName = entity.name;
          $scope.viewWidgetVars.TEXT_IS_NOT_TRACKABLE =  $filter('csSanitizeHTML')(widgetUtilityService.translate('socOverviewSankey.TEXT_IS_NOT_TRACKABLE',{'moduleName' : $scope.config.entityName ? $scope.config.entityName.toUpperCase() : ''}));
          $scope.params.formFields = entity.getFormFields();
          $scope.params.relationshipFieldsArray = entity.getRelationshipFieldsArray();
          $scope.params.sourceNodeFields = _.filter($scope.params['formFields'], function (field) {
            return field.type === 'text' || field.type === 'picklist';
          });
          $scope.params.selectedTargetNodeFields = _.filter($scope.params['formFields'], function (field) {
            return field.type === 'text' || field.type === 'picklist' || field.type === 'manyToMany';
          });
          $scope.params.extendedTargetNodeFields = angular.extend($scope.params.selectedTargetNodeFields, $scope.params.relationshipFieldsArray);
          $scope.params.targetNodeFields = _.sortBy($scope.params.extendedTargetNodeFields, 'name');
          if ($scope.config.layers.length === 0) {
             insertLayerObject();
          }
          else {
            $scope.config.layers.forEach(function (element, index) {
              if (element.targetNodeField) {
                checkTargetType(index);
              }
            });
          }
        });
      }
  
      //change in target node selection
      function onChangeTarget(_index) {
        $scope.params['targetNodesSubFields_' + _index] = [];
        $scope.config.layers[_index]['targetNodeSubField'] = null;
        checkTargetType(_index);
      }
  
      //Check if target is picklist or manyToMany
      function checkTargetType(_index) {
        let _currentTargetData = _.filter($scope.params.targetNodeFields, function (field) {
          return field.name === $scope.config.layers[_index].targetNodeField
        });
        if (_currentTargetData && _currentTargetData.length > 0 && (_currentTargetData[0]['type'] === 'manyToMany' || _currentTargetData[0]['type'] === 'picklist')) {
          var targetEntity = new Entity(_currentTargetData[0]['module']);
          targetEntity.loadFields().then(function () {
            $scope.params.targetFormField = targetEntity.getFormFieldsArray();
            $scope.params['targetNodesSubFields_' + _index] = _.filter($scope.params.targetFormField, function (field) {
              return field.type === 'picklist' || field.type === 'text';
            });
            $scope.params['targetNodesSubFields_' + _index] = _.sortBy($scope.params['targetNodesSubFields_' + _index], 'name');
          });
        }
        $scope.config.layers[_index]['targetNodeType'] = _currentTargetData[0]['type'];
        $scope.config.layers[_index]['targetNodeModule'] = _currentTargetData[0]['module'];
      }
  
      //to check the subtarget type
      function addSubTargetType(_index) {
        let subType = _.filter($scope.params['targetNodesSubFields_' + _index], function (field) {
          return field.name === $scope.config.layers[_index].targetNodeSubField
        })
        $scope.config.layers[_index]['targetNodeSubType'] = subType[0]['type'];
      }
  
      function addLayer() {
        insertLayerObject();
        if ($scope.config.layers.length >= 3) {
          $scope.maxlayers = true;
        }
      }
  
      function removeLayer(index) {
        $scope.maxlayers = false;
        if (index !== 0) {
          $scope.config.layers.splice(index, 1);
        }
      }
  
      //provide i18n support
      function _handleTranslations() {
        let widgetNameVersion = widgetUtilityService.getWidgetNameVersion($scope.$resolve.widget, $scope.$resolve.widgetBasePath);
  
        if (widgetNameVersion) {
          widgetUtilityService.checkTranslationMode(widgetNameVersion).then(function () {
            $scope.viewWidgetVars = {
              // Create your translating static string variables here
              HEADER_ADD_CHART: widgetUtilityService.translate('socOverviewSankey.HEADER_ADD_CHART'),
              HEADER_EDIT_CHART: widgetUtilityService.translate('socOverviewSankey.HEADER_EDIT_CHART'),
              LABEL_TITLE: widgetUtilityService.translate('socOverviewSankey.LABEL_TITLE'),
              LABEL_DATASOURCE: widgetUtilityService.translate('socOverviewSankey.LABEL_DATASOURCE'),
              LABEL_RECORD_CONTAINING_JSON_DATA: widgetUtilityService.translate('socOverviewSankey.LABEL_RECORD_CONTAINING_JSON_DATA'),
              LABEL_JSON_DATA_SOURCE_MODULES: widgetUtilityService.translate('socOverviewSankey.LABEL_JSON_DATA_SOURCE_MODULES'),
              LABEL_SELECT_AN_OPTION: widgetUtilityService.translate('socOverviewSankey.LABEL_SELECT_AN_OPTION'),
              LABEL_GET_LIVE_DATA: widgetUtilityService.translate('socOverviewSankey.LABEL_GET_LIVE_DATA'),
              LABEL_SELECT_FIELD: widgetUtilityService.translate('socOverviewSankey.LABEL_SELECT_FIELD'),
              LABEL_FILTER_RECORD: widgetUtilityService.translate('socOverviewSankey.LABEL_FILTER_RECORD'),
              LABEL_SELECT_A_MODULE: widgetUtilityService.translate('socOverviewSankey.LABEL_SELECT_A_MODULE'),
              LABEL_FILTER_CRITERIA: widgetUtilityService.translate('socOverviewSankey.LABEL_FILTER_CRITERIA'),
              LABEL: widgetUtilityService.translate('socOverviewSankey.LABEL'),
              LABEL_SOURCE_NODE: widgetUtilityService.translate('socOverviewSankey.LABEL_SOURCE_NODE'),
              LABEL_SELECT_SOURCE_NODE: widgetUtilityService.translate('socOverviewSankey.LABEL_SELECT_SOURCE_NODE'),
              LABEL_TARGET_NODE: widgetUtilityService.translate('socOverviewSankey.LABEL_TARGET_NODE'),
              LABEL_SELECT_TARGET_NODE: widgetUtilityService.translate('socOverviewSankey.LABEL_SELECT_TARGET_NODE'),
              LABEL_TARGET_NODE_FIELD: widgetUtilityService.translate('socOverviewSankey.LABEL_TARGET_NODE_FIELD'),
              LABEL_SELECT_PICKLIST: widgetUtilityService.translate('socOverviewSankey.LABEL_SELECT_PICKLIST'),
              LABEL_RESOURCE: widgetUtilityService.translate('socOverviewSankey.LABEL_RESOURCE'),
              BUTTON_ADD_LAYER: widgetUtilityService.translate('socOverviewSankey.BUTTON_ADD_LAYER'),
              BUTTON_SAVE: widgetUtilityService.translate('socOverviewSankey.BUTTON_SAVE'),
              BUTTON_CLOSE: widgetUtilityService.translate('socOverviewSankey.BUTTON_CLOSE'),
              TEXT_IS_NOT_TRACKABLE: $filter('csSanitizeHTML')(widgetUtilityService.translate('socOverviewSankey.TEXT_IS_NOT_TRACKABLE',{'moduleName' : $scope.config.entityName ? $scope.config.entityName.toUpperCase() : ''})),
              TOOLTIP_DATASOURCE:  widgetUtilityService.translate('socOverviewSankey.TOOLTIP_DATASOURCE'),
              TOOLTIP_JSONDATA: widgetUtilityService.translate('socOverviewSankey.TOOLTIP_JSONDATA'),
              TOOLTIP_LIVEDATA: widgetUtilityService.translate('socOverviewSankey.TOOLTIP_LIVEDATA'),
              TOOLTIP_JSON_SELECT_MODULE: widgetUtilityService.translate('socOverviewSankey.TOOLTIP_JSON_SELECT_MODULE'),
              TOOLTIP_JSON_TYPE_DATA: widgetUtilityService.translate('socOverviewSankey.TOOLTIP_JSON_TYPE_DATA'),
              TOOLTIP_JSON_RECORD_FIELD: widgetUtilityService.translate('socOverviewSankey.TOOLTIP_JSON_RECORD_FIELD'),
              MESSAGE_LINKED: widgetUtilityService.translate('socOverviewSankey.MESSAGE_LINKED'),
              RECORD_SIZE_LABEL : widgetUtilityService.translate('socOverviewSankey.RECORD_SIZE_LABEL')
            };
            $scope.header = $scope.config.title ? $scope.viewWidgetVars.HEADER_EDIT_CHART : $scope.viewWidgetVars.HEADER_ADD_CHART;
            loadModules();
          });
        }
        else {
          $timeout(function () {
            cancel();
          }, 100)
        }
      }
  
      function cancel() {
        $uibModalInstance.dismiss('cancel');
      }
  
      function save() {
        checkResourceType();
        if (!$scope.editSankeyWidgetForm.$valid) {
          $scope.editSankeyWidgetForm.$setTouched();
          $scope.editSankeyWidgetForm.$focusOnFirstError();
          return;
        }
        $uibModalInstance.close($scope.config);
      }
  
      //save and use the source type for payload changes
      function checkResourceType() {
        var _sourceType = _.filter($scope.params['formFields'], function (field) {
           if(field.name === $scope.config.layers[0].sourceNodesField){
             return field.type;
           }
         });
         $scope.config['sourceNodeType'] = _sourceType[0].type;
      }

      function init() {
        _handleTranslations();
      }
  
      init();
    }
  })();
  