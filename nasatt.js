process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	let aeronautics = await processList('aeronautics');
	console.log(aeronautics[0], aeronautics.length);
});

(async function() {
	console.warn('initializing');
	let categories = [
		'aeronautics',
		'communications',
		'electrical and electronics',
		'environment',
		'health medicine and biotechnology',
		'information technology and software',
		'instrumentation',
		'manufacturing',
		'materials and coatings',
		'mechanical and fluid systems',
		'optics',
		'power generation and storage',
		'propulsion',
		'robotics automation and control',
		'sensors',
	];
	console.warn('categories returned');
	let data = [];
	log.setMax('category', categories.length);
	for (let category of categories) {
		let list = await processList(category);
		data = data.concat(list);
		log.inc('category');
	}
	
	stringify(data, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
})();

async function processList(category) {
	let raw = null;
	try {
		raw = await request(`https://technology.nasa.gov/svr/search.php?r=category&d=/patent&q=&p=0&c=${category}`);
	}
	catch (e) {
		return [];
	}

	let data = JSON.parse(raw);
	let pages = Math.ceil(data.total / data.page_ln);
	log.setMax(category, data.total);
	let results = [];
	for (let i = 1; i <= pages; i++) {
		let raw = null;
		try {
			raw = await request(`https://technology.nasa.gov/svr/search.php?r=category&d=/patent&q=&p=${i}&c=${category}`);
		}
		catch (e) {
			continue;
		}

		let data = JSON.parse(raw);
		for (let key in data.results) {
			results.push(await processItem(`https://technology.nasa.gov/svr/search.php?d=patent&r=geturl&q=${data.results[key][1]}`));
			log.inc(category);
		}
	}
	return results;
}

async function processItem(link) {
	let raw = null;
	try {
		raw = await request(link);
	}
	catch (e) {
		return null;
	}

	let data = JSON.parse(raw);
	return {
		title: (data.results[0].subtitle !== '' ? data.results[0].title + ': ' + data.results[0].subtitle : data.results[0].title),
		summary: data.results[0].abstract + ' ' + data.results[0].tech_desc,
		id: data.results[0].id,
		patent_number: data.results[0].patent_number,
		category: data.results[0].category,
		contact: data.results[0].cname,
		phone: data.results[0].cphone,
		email: data.results[0].cemail,
	};
}
