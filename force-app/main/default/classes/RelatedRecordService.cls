public with sharing class RelatedRecordService {
    private static RLConfig config;
    
    @AuraEnabled(cacheable=true)
    public static RLConfig getRelatedListConfigDetails( String rlcName ) {
        try {
            
            List<Related_List_Configuration__mdt> listOfRLConfigurations = getRelatedListConfigMetadata(rlcName);
            
            Related_List_Configuration__mdt rlConfig = listOfRLConfigurations[0];
            
            //
            // Create RLConfig instance to send back.
            //
            config = new RLConfig();
            config.title = rlConfig.MasterLabel;
            config.iconurl = rlConfig.Icon_URL__c;
            config.iconBGColor = rlConfig.Icon_BG_Color__c;
            config.parentObject = rlConfig.Parent_Object__c;
            config.childObject = rlConfig.Child_Object__c;
            config.parentIdField = rlConfig.Parent_ID_Field__c;
            config.noOfRows = Integer.valueOf(rlConfig.Number_of_Rows__c);
            config.enableInfiniteScrolling = rlConfig.Infinite_Scrolling__c;
            config.enableCustomActions = rlConfig.Custom_Actions__c;
            config.enableDeleteAction = rlConfig.Delete_Action__c;
            config.enableEditAction = rlConfig.Edit_Action__c;
            config.enableNewAction = rlConfig.New_Action__c;
            config.enableViewAction = rlConfig.View_Action__c;
            config.useCustomWhereClause = rlConfig.Use_Custom_WHERE_Clause__c;
            config.customWhereClause = rlConfig.Custom_WHERE_Clause__c;
            config.layout = rlConfig.Layout__c;
            config.height = Integer.valueOf(rlConfig.Height__c);

            //
            // Get child relationship name
            //
            List<Schema.DescribeSObjectResult> describeSobjects = Schema.describeSObjects(new List<String>{rlConfig.Parent_Object__c});
            for(Schema.Childrelationship eachRelationship : describeSobjects[0].getChildRelationships()){
                if(eachRelationship.getChildSObject().getDescribe().getLocalName() == rlConfig.Child_Object__c){
                    config.relationshipName = String.valueOf(eachRelationship.getRelationshipName());
                }
            }

            //
            //  Create Columns 
            //
            describeSobjects = Schema.describeSObjects(new List<String>{rlConfig.Child_Object__c});
            
            if (rlConfig.getSObjects('Related_List_Field_Configurations__r') != null && rlConfig.getSObjects('Related_List_Field_Configurations__r').size() != 0){
                RelatedRecordService.RLField field;
                for (Sobject eachCh : (List<SObject>)rlConfig.getSObjects('Related_List_Field_Configurations__r')) {
                    if(eachCh.get('Field_Name__c') != null){
                        field = new RelatedRecordService.RLField();
                        
                        field.fieldName = String.valueOf(eachCh.get('Field_Name__c'));
                        field.label = String.valueOf(eachCh.get('Field_Label__c'));
                        if(String.isEmpty(field.label)){
                            field.label = describeSobjects[0].fields.getMap().get(String.valueOf(eachCh.get('Field_Name__c'))).getDescribe().getName();
                        }
                        
                        field.sequence = Integer.valueOf(eachCh.get('Sequence__c'));
                        field.sortable = Boolean.valueOf(eachCh.get('Sortable__c'));
                        field.enableFilter = Boolean.valueOf(eachCh.get('Filter__c'));
                        field.filterValues = String.valueOf(eachCh.get('Filter_Values__c'));

                        if(field.fieldName.toLowerCase().contains('name')){
                            field.type = 'url';
                            field.fieldName = 'nameUrl';
                            TypeAttrLabel attr = new TypeAttrLabel('Name');
                            field.typeAttributes = new TypeAttribute(attr);
                        }else{
                            field.type = describeSobjects[0].fields.getMap().get(String.valueOf(eachCh.get('Field_Name__c'))).getDescribe().getType().name();
                        }
                        
                        //
                        // Get Column Header level actions, if any. These need to be set at individual column/field
                        //
                        setColumnHeaderActions(field, rlConfig, describeSobjects[0]);
                        config.fields.add(field);
                    }
                }

                //
                // Get row level actions. these need to be added to the columns/fields array
                //
                setRowAndListActions(rlConfig, describeSobjects[0]);
            }                
            
            return config;
            
        }
        catch(Exception e) {
            System.debug(e.getStackTraceString());
            throw new AuraHandledException(e.getMessage());
        }
    }

    private static void setRowAndListActions(Related_List_Configuration__mdt rlConfig, Schema.DescribeSObjectResult describeSobject){
        
        List<RelatedRecordService.RLAction> actions = new List<RelatedRecordService.RLAction>();
        if(rlConfig.Upload_Files_Action__c){
            RelatedRecordService.RLAction action = new RelatedRecordService.RLAction();
            action.label = 'Upload Files';action.name = 'Files';action.actionURL = '';action.type = 'ListAction';action.isFileUpload=true;
            actions.add(action);
        }
        if(rlConfig.New_Action__c && describeSobject.isCreateable()){
            RelatedRecordService.RLAction action = new RelatedRecordService.RLAction();
            action.label = 'New';action.name = 'New';action.actionURL = '';action.type = 'ListAction';
            actions.add(action);
        }
        if(rlConfig.Edit_Action__c && describeSobject.isUpdateable()){
            RelatedRecordService.RLAction action = new RelatedRecordService.RLAction();
            action.label = 'Edit';action.name = 'Edit';action.actionURL = '';action.type = 'RowAction';
            actions.add(action);
        }
        if(rlConfig.View_Action__c && describeSobject.isAccessible()){
            RelatedRecordService.RLAction action = new RelatedRecordService.RLAction();
            action.label = 'View';action.name = 'View';action.actionURL = '';action.type = 'RowAction';
            actions.add(action);
        }
        if(rlConfig.Delete_Action__c && describeSobject.isDeletable()){
            RelatedRecordService.RLAction action = new RelatedRecordService.RLAction();
            action.label = 'Delete';action.name = 'Delete';action.actionURL = '';action.type = 'RowAction';
            actions.add(action);
        }
        //
        // If Custom Actions are enabled, then get Custom Row and List Actions configuration details, and add to columns/fields array
        // 
        if(rlConfig.Custom_Actions__c){
            if (rlConfig.getSObjects('Related_List_Action_Configurations__r') != null && rlConfig.getSObjects('Related_List_Action_Configurations__r').size() != 0){
                RelatedRecordService.RLAction action;
                for (Sobject eachCh : (List<SObject>)rlConfig.getSObjects('Related_List_Action_Configurations__r')) {
                    action = new RelatedRecordService.RLAction();
                    action.label = String.valueOf(eachCh.get('MasterLabel'));
                    action.name = String.valueOf(eachCh.get('DeveloperName'));
                    action.type = String.valueOf(eachCh.get('Type__c'));
                    action.actionURL = String.valueOf(eachCh.get('Action_URL__c'));
                    action.targetType = String.valueOf(eachCh.get('Target_Type__c'));
                    action.params = String.valueOf(eachCh.get('Parameters__c'));
                    action.sequence = Integer.valueOf(eachCh.get('Sequence__c'));
                    if(action.type == 'ListAction' && action.targetType == 'Import'){
                        action.isDataImport = true;
                    }
                    actions.add(action);
                }
            }   
        }

        if(actions.size() > 0){
            config.actions.addAll(actions);
        }
    }

    private static void setColumnHeaderActions(RelatedRecordService.RLField field,  Related_List_Configuration__mdt rlConfig, Schema.DescribeSObjectResult describeSobject){
        //
        // If Custom Actions are enabled, then get Custom Column Header Action configuration details, and add to individual field
        // 
        if(rlConfig.Custom_Actions__c){
            
        }
    }

    private static List<Related_List_Configuration__mdt> getRelatedListConfigMetadata(String rlcName){
        //
        // Query Related List configuration details, including field and custom action configurations.
        // 
        String fieldListConfigQuery = 'SELECT Field_Label__c, Field_Name__c, Sequence__c, Sortable__c, Filter__c, Filter_Values__c '
                                    + 'FROM Related_List_Field_Configurations__r '
                                    + 'WHERE Active__c = true ORDER BY Sequence__c ASC';
        
        String actionConfigQuery = 'SELECT MasterLabel, DeveloperName, Type__c, Action_URL__c, Target_Type__c, Parameters__c, Sequence__c '
                                    + 'FROM Related_List_Action_Configurations__r '
                                    + 'WHERE Active__c = true ORDER BY Sequence__c ASC';

        String queryRLConfiguration = 'SELECT Id, MasterLabel, DeveloperName, '
                                    + 'Active__c, '
                                    + 'Parent_Object__c, '
                                    + 'Child_Object__c, '
                                    + 'Icon_URL__c, '
                                    + 'Icon_BG_Color__c, '
                                    + 'Parent_ID_Field__c, '
                                    + 'Number_of_Rows__c, '
                                    + 'New_Action__c, '
                                    + 'Edit_Action__c, '
                                    + 'View_Action__c, '
                                    + 'Delete_Action__c, '
                                    + 'Upload_Files_Action__c, '
                                    + 'Custom_Actions__c, '
                                    + 'Infinite_Scrolling__c, '
                                    + 'Use_Custom_WHERE_Clause__c, '
                                    + 'Custom_WHERE_Clause__c, '
                                    + 'Layout__c, '
                                    + 'Height__c, '
                                    + '(' + fieldListConfigQuery + '), '
                                    + '(' + actionConfigQuery + ') '
                                + 'FROM Related_List_Configuration__mdt '
                                + 'WHERE Active__c = true AND '
                                + 'DeveloperName =:rlcName LIMIT 1';
                                
        //System.debug('queryRLConfiguration'+queryRLConfiguration);
        List<Related_List_Configuration__mdt> listOfRLConfigurations = Database.query( queryRLConfiguration );

        return listOfRLConfigurations;
    }
    
    @AuraEnabled(cacheable=true)
    public static List<SObject> getRelatedData( String rlcName, String parentId ) {
        List<SObject> records = new List<SObject>();
        try{
            config = getRelatedListConfigDetails(rlcName);
            String fieldList = '';
            for(RelatedRecordService.RLField fld : config.fields){
                if(fld.fieldName != 'nameURL'){
                    fieldList += fld.fieldName + ',';
                }
            }
            fieldList = fieldList.removeEnd(',');

            String sQuery = 'SELECT Id, Name, '
            + fieldList
            + ' FROM ' + config.childObject
            + ' WHERE ' + config.parentIdField + '=\'' + ID.valueOf(parentId) + '\''; 
            if(config.useCustomWhereClause && !String.isEmpty(config.customWhereClause)){
                sQuery += ' AND (' + config.customWhereClause + ')';
            }
            
            records = Database.query( sQuery );
        }
        catch(Exception e) {
            System.debug('error::' + e.getMessage());
            throw new AuraHandledException(e.getMessage());
        }
        return records;
    }

    @AuraEnabled(cacheable=false)
    public static List<SObject> importDataFromCSV( String rlcName, String parentId, Id documentId ) {
        List<SObject> records = new List<SObject>();
        try{
            //try it
            //RLConfig config = getRelatedListConfigDetails(rlcName);
            List<Schema.DescribeSObjectResult> describeSobjects = Schema.describeSObjects(new List<String>{'ContentVersion'});
            if(describeSobjects[0].isQueryable() && describeSobjects[0].fields.getMap().get('VersionData').getDescribe().isAccessible()) {
            
                // getting File Data based on document id 
                ContentVersion objVersion = [SELECT Id, VersionData FROM ContentVersion WHERE ContentDocumentId =:documentId];
                // split the file data
                if(objVersion != null && objVersion.VersionData != null){
                    List<List<String>> csvData = RL_CSVParser.read(objVersion.VersionData.toString());
                    processCSVData(rlcName, parentId, csvData);
                }
            }

        }
        catch(Exception e) {
            System.debug('Error importing CSV data::' + e.getMessage() + '\n <> StackTrace:: ' + e.getStackTraceString());
            throw new AuraHandledException(e.getMessage());
        }
        return records;
    }
    
    private static void processCSVData(String rlcName, String parentId, List<List<String>> data){
        
        RLConfig config = getRelatedListConfigDetails(rlcName);
        List<Schema.DescribeSObjectResult> describeSobjects = Schema.describeSObjects(new List<String>{config.childObject});
        Schema.SObjectType sObjType = describeSobjects[0].getSObjectType();
        List<SObject> recordsToInsert = new List<SObject>();
        List<SObject> recordsToUpdate = new List<SObject>();

        for(Integer i = 1; i < data.size(); i++){
            SObject sObj = createSObjectRecord(sObjType, data[0], data[i]);
            if(sObj.get('Id') != null){
                recordsToUpdate.add(sObj);
            }else{
                sObj.put(config.parentIdField, parentId);
                recordsToInsert.add(sObj);
            }
        }
      
        if(!recordsToInsert.isEmpty() && describeSobjects[0].isCreateable()) {
            insert recordsToInsert;
        }

        if(!recordsToUpdate.isEmpty() && describeSobjects[0].isUpdateable()) {
            update recordsToUpdate;
        }
    }
    
    private static SObject createSObjectRecord(Schema.SObjectType sObjType, List<String> headers, List<String> recData){
        SObject sObj = sObjType.newSObject();
        for(Integer i = 0; i < headers.size(); i++){
            if(headers[i].toLowerCase() == 'id' && (recData[i] == null || recData[i].length() <=0 )){
                //Do not add ID field if ID value is null 
            }else{
                sObj.put(headers[i], recData[i]);
            }
        }
        return sObj;
    }

    public class RLConfig {
        @AuraEnabled public String title;
        @AuraEnabled public String iconurl;
        @AuraEnabled public String iconBGColor;
        @AuraEnabled public String parentObject;
        @AuraEnabled public String childObject;
        @AuraEnabled public String relationshipName;
        @AuraEnabled public String parentIdField;
        @AuraEnabled public Integer noOfRows;
        @AuraEnabled public List<RLField> fields = new List<RLField>();
        @AuraEnabled public List<RLAction> actions = new List<RLAction>();
        @AuraEnabled public Boolean enableCustomActions;
        @AuraEnabled public Boolean enableNewAction;
        @AuraEnabled public Boolean enableEditAction;
        @AuraEnabled public Boolean enableViewAction;
        @AuraEnabled public Boolean enableDeleteAction;
        @AuraEnabled public Boolean enableInfiniteScrolling;
        @AuraEnabled public Boolean useCustomWhereClause;
        @AuraEnabled public String customWhereClause;     
        @AuraEnabled public String layout;          
        @AuraEnabled public Integer height;                      
    }
    private class RLField{
        @AuraEnabled public String label;
        @AuraEnabled public String fieldName;
        @AuraEnabled public String type;
        @AuraEnabled public Boolean enableFilter;
        @AuraEnabled public String filterValues;
        @AuraEnabled public Integer sequence;
        @AuraEnabled public Boolean sortable;
        @AuraEnabled public TypeAttribute typeAttributes;
        @AuraEnabled public Boolean editable = false;
    }
    private class RLAction{
        @AuraEnabled public String label;
        @AuraEnabled public String name;
        @AuraEnabled public String type;
        @AuraEnabled public String actionURL;
        @AuraEnabled public String targetType;
        @AuraEnabled public String params;
        @AuraEnabled public Integer sequence;
        @AuraEnabled public Boolean isFileUpload = false;
        @AuraEnabled public Boolean isDataImport = false;
    }

    private class TypeAttribute{
        @AuraEnabled public TypeAttrLabel label;
        //@AuraEnabled public String target='_self';

        TypeAttribute(TypeAttrLabel lbl, String tgt){
            label = lbl;
            //target = tgt;
        }
        TypeAttribute(TypeAttrLabel lbl){
            label = lbl;
        }

    }

    private class TypeAttrLabel{
        @AuraEnabled public String fieldName;
        TypeAttrLabel(String name){
            fieldName = name;
        }
    }

}