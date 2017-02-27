process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import request from 'request-promise-native';
import cheerio from 'cheerio';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await processItem('https://www.nrl.navy.mil/techtransfer/available-technologies/materials/controlled-release-antifouling-paint-additive'));
})();

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
});

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
	let raw = await request(link);
	let $ = cheerio.load(raw);

	return {
		title: $('h1#page-title').text().trim(),
	};
}
