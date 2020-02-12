@IsTest
public with sharing class RelatedRecordServiceTest {
    public RelatedRecordServiceTest() {

    }

    @IsTest
    static void testMedatadataServiceAPI(){
        
        Test.startTest();
    
        RelatedRecordService.RLConfig config = RelatedRecordService.getRelatedListConfigDetails('AccountContacts');
        System.assertNotEquals(null, config);
        System.assertEquals('Contacts', config.title);
        
        Test.stopTest();
        
    }

    @IsTest
    static void testRelatedDataServiceAPI(){
        
        Test.startTest();
        List<Account> accts = [SELECT Id, Name FROM Account LIMIT 1];

        List<Contact> testConts = [SELECT Id,Name,Phone,Email,MailingAddress FROM Contact WHERE AccountId= :accts[0].Id];
        System.debug('test contacts>>' + testConts);

        List<Contact> contacts = (List<Contact>)RelatedRecordService.getRelatedData('AccountContacts', accts[0].Id);
        System.assertEquals(2, contacts.size());
        
        Test.stopTest();
        
    }

    @testSetup static void setup() {
        // Create common test accounts    06
        List<Account> testAccts = new List<Account>();
        for(Integer i=0;i<1;i++) {
            testAccts.add(new Account(Name = 'TestAcct'+i));
        }
        insert testAccts;

        List<Contact> testCons = new List<Contact>();
        for(Account acct : testAccts){
            for(Integer i=0;i<2;i++) {
                Contact cont = new Contact(FirstName = 'TestFirstName'+i, LastName='TestLastName'+i, Phone='12345678'+i, email='abc@xyz.com'+i, MailingStreet=i+' Main St', MailingCity='Washington', MailingState='DC');
                //cont.Account = acct;
                cont.AccountId = acct.Id;
                testCons.add(cont);
            }
        }
        try{
        insert testCons;
        System.debug('test contacts inserted'+testCons);
        }catch(Exception e){
            
            System.debug(e.getMessage());

        }
    }
}
