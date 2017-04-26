process.on('unhandledRejection', err => console.warn(err));

import cheerio from 'cheerio';
import request from 'request-promise-native';
import stringify from 'csv-stringify';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await processList('http://api.brewerydb.com/v2/breweries?key=a2bde7623cd105327186d4d797913324&region=California&p=1&json'));
})();

(async function() {
	let results = [];
 
	await step('https://techportal.eere.energy.gov/api/energy-innovations/v1/patents?api_key=Y4OlSJW3x5XHQZYJZlAJZGcC2pRRm1z9FvFRXGKC&format=JSON&page=0&size=150');
 
	stringify(results, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
 
	async function step(url) {
		let { list, next } = await processList(url);
		results = results.concat(list);
		
		if (next) {
			await step(next);
		}
	}
});

async function processList(url) {
	console.warn('Parsing URL');
	let data = await parseUrl(url);
	console.warn('URL Parsed');
	let list = [];
	let page = data.currentPage;
	let pageMax = data.numberOfPages;
	
	console.log(pageMax);
	
	for (page; page < (pageMax + 1); page++) {
		data = await parseUrl(`http://api.brewerydb.com/v2/breweries?key=a2bde7623cd105327186d4d797913324&region=California&p=${page}&json`);
		for (let each in data.data) {
			list.push(data.data[each].id)
		}
		console.log(page);
	}
 
	return list;
}

async function processItem(data) {
	console.warn(data._links.self.href);
	return {
		title: data.title,
		summary: data.summary,
		patent_number: await getPatentNumber(data.linkToPatentOnEnergyInnovationPortalWebsite),
		lab: await parseUrl(data._links.lab.href, 'labName'),
		inventors: await getInventors(data._links.inventors.href),
		assignees: await getAssignees(data._links.assignees.href),
	};
}

async function parseUrl(url, key = null) {
	try {
		let raw = await request(url);
		let data = JSON.parse(raw);
		if (key) {
			return data[key];
		}
		return data;
	}
	
	catch (e) {
		return null;
	}
}
