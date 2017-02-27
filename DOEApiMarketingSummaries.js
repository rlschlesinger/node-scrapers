process.on('unhandledRejection', err => console.warn(err));

import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

let api = 'Y4OlSJW3x5XHQZYJZlAJZGcC2pRRm1z9FvFRXGKC';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log((await processList('https://developer.nrel.gov/api/energy-innovations/v1/marketingSummaries?api_key=Y4OlSJW3x5XHQZYJZlAJZGcC2pRRm1z9FvFRXGKC&format=JSON')).list[0]);
});

(async function() {
	let results = [];
 
	await step('https://techportal.eere.energy.gov/api/energy-innovations/v1/marketingSummaries?format=JSON&page=0&size=20');
 
 stringify(results, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
 
	async function step(url) {
		console.warn(new Date());
		let { list, next } = await processList(`${url}&api_key=${api}`);
		results = results.concat(list);
		
		if (next) {
			await step(next);
		}
	}
})();

async function processList(url) {
	let raw = await request(url);
	let data = JSON.parse(raw);
 
	let list = [];
 
	for (let summary of data._embedded.marketingSummaries) {
		list.push(await processItem(summary));
	}
 
	return {
		next: data._links.next && data._links.next.href,
		list,
	};
}

async function processItem(data) {
	return {
		title: data.title,
		summary: data.summary,
		description: data.description,
		applications: data.applications,
		benefits: data.benefits,
		link: data.linkToMarketingSummayOnEnergyInnovationPortalWebsite,
		patents: await getPatents(data._links.patents.href),
		technology_categories: await getTechCategories(data._links.technologyCategories.href),
		technology_stage: await parseUrl(data._links.technologyStage.href, 'stageName'),
		active: await parseUrl(data._links.technologyStage.href, 'isActive'),
		license_status: await parseUrl(data._links.technologyLicenseStatus.href, 'statusDescription'),
		lab: await parseUrl(data._links.lab.href, 'labName'),
	};
}

// function cleanList(list) {
// 	return list.replace(/(<ul>|<\/ul>|<\/li>|<br>|<br \/>|\r\n)/g, '').replace(/<li>/g, '\n')
// }

async function parseUrl(url, key = null) {
	let raw = await request(url);
	let data = JSON.parse(raw);
	if (key) {
		return data[key];
	}
	return data;
}

async function getTechCategories(url) {
	let data = await parseUrl(url);
	let categories = [];
	
	for (let each of data._embedded.technologyCategories) {
		categories.push(each.categoryName);
	}
	
	return categories;
}

async function getPatents(url) {
	let data = await parseUrl(url);
	let patents = [];
	
	if (!data._embedded) {
		return null;
	}
	
	for (let each of data._embedded.patents) {
		patents.push({
			title: each.title,
			patent_number: each.patentNumber,
			link: each.linkToPatentOnEnergyInnovationPortalWebsite,
		});
	}
	
	return patents;
}
