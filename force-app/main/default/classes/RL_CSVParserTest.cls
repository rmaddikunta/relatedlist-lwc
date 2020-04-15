@isTest 
public with sharing class RL_CSVParserTest {

	@isTest static void testCSVReader1() {
		String csvString = 'fieldName1,fieldName2,fieldName3,fieldName4\r\n' +
		                   '"valu,e a1","value\nb1",value c1,\n' +
		                   'value a2,"value\"b2","valu""e c2",\r\n' +
		                   ',value\"b3,value\'c3,\'value d3\'\n' +
		                   '"value,a4","",,\'value d4\'';
		                   
		List<List<String>> data = RL_CSVParser.read(csvString);
		
		System.assertEquals('valu,e a1', data[1][0], 'Oops! data parsed incorrectly');
		System.assertEquals('value\nb1', data[1][1],'Oops! data parsed incorrectly');
		System.assertEquals('value c1', data[1][2],'Oops! data parsed incorrectly');
		System.assertEquals('', data[1][3],'Oops! data parsed incorrectly');
		
		System.assertEquals('value a2', data[2][0],'Oops! data parsed incorrectly');
		System.assertEquals('value"b2', data[2][1],'Oops! data parsed incorrectly');
		System.assertEquals('valu""e c2', data[2][2],'Oops! data parsed incorrectly');
		System.assertEquals('', data[2][3],'Oops! data parsed incorrectly');
		
		System.assertEquals('', data[3][0],'Oops! data parsed incorrectly');
		System.assertEquals('value"b3', data[3][1],'Oops! data parsed incorrectly');
		System.assertEquals('value\'c3', data[3][2],'Oops! data parsed incorrectly');
		System.assertEquals('\'value d3\'', data[3][3],'Oops! data parsed incorrectly');

		System.assertEquals('value,a4', data[4][0],'Oops! data parsed incorrectly');
		System.assertEquals('', data[4][1],'Oops! data parsed incorrectly');
		System.assertEquals('', data[4][2],'Oops! data parsed incorrectly');
		System.assertEquals('\'value d4\'', data[4][3],'Oops! data parsed incorrectly');
	}

	@isTest static void testCSVReader2() {
		String csvString = 'fieldName1\r\n' +
		                   '"valu,e a1"\n' +
		                   'value a2\n' +
		                   '\n' +
		                   '""\n' +
		                   '"value,a4"';
		                   
		List<List<String>> data = RL_CSVParser.read(csvString);
		
		System.assertEquals('valu,e a1', data[1][0],'Oops! data parsed incorrectly');
		System.assertEquals('value a2', data[2][0],'Oops! data parsed incorrectly');
		System.assertEquals('', data[3][0],'Oops! data parsed incorrectly');
		System.assertEquals('', data[4][0],'Oops! data parsed incorrectly');
		System.assertEquals('value,a4', data[5][0],'Oops! data parsed incorrectly');
	}
}