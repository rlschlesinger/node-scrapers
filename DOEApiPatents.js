process.on('unhandledRejection', err => console.warn(err));

import cheerio from 'cheerio';
import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

let api = 'Y4OlSJW3x5XHQZYJZlAJZGcC2pRRm1z9FvFRXGKC';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await processList('https://techportal.eere.energy.gov/api/energy-innovations/v1/patents?api_key=Y4OlSJW3x5XHQZYJZlAJZGcC2pRRm1z9FvFRXGKC&format=JSON&size=50'));
});

(async function() {
	let results = [];
 
	await step('https://techportal.eere.energy.gov/api/energy-innovations/v1/patents?api_key=Y4OlSJW3x5XHQZYJZlAJZGcC2pRRm1z9FvFRXGKC&format=JSON&page=0&size=150');
 
 stringify(results, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
 
	async function step(url) {
		console.warn(new Date());
		let { list, next } = await processList(url);
		results = results.concat(list);
		
		if (next) {
			await step(next);
		}
	}
})();

async function processList(url) {
	console.warn('Parsing URL');
	let data = await parseUrl(url);
	console.warn('URL Parsed');
	let list = [];
	
	if (!data._embedded) {
		return null;
	}
	console.warn('data._embedded.patents found');
	for (let summary of data._embedded.patents) {
		list.push(await processItem(summary));
	}
 
	return {
		next: data._links.next && data._links.next.href,
		list,
	};
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

async function getInventors(url) {
	let data = await parseUrl(url);
	let inventors = [];
	
	if (!data._embedded) {
		return null;
	}
	
	for (let each of data._embedded.inventors) {
		inventors.push(each.name);
	}
	
	return inventors;
}

async function getAssignees(url) {
	let data = await parseUrl(url);
	let assignees = [];
	
	if (!data._embedded) {
		return null;
	}
	
	for (let each of data._embedded.assignees) {
		assignees.push(each.name);
	}
	
	return assignees;
}

async function getPatentNumber(url) {
	let raw = await request(url);
	let $ = cheerio.load(raw);
	let node = $('td.patent_detail_value a[href^="/patent.do"]')[0];
	if (node) {
		return node.children[0].data.trim();
	}
	return null;
}
