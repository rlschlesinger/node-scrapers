process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import request from 'request-promise-native';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await processItem('https://technology.nasa.gov/svr/search.php?d=public_domain&r=geturl&q=SSC-00048'));
});

(async function() {
	let data = [];
	let list = await processList('https://technology.nasa.gov/svr/search.php?d=/public_domain&p=1');
	data = data.concat(list);
	
	stringify(data, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
})();

async function processList(link) {
	let raw = null;
	try {
		raw = await request('https://technology.nasa.gov/svr/search.php?d=/public_domain&p=1');
	}
	catch (e) {
		return [];
	}

	let data = JSON.parse(raw);
	let pages = Math.ceil(data.total / data.page_ln);
	let results = [];
	for (let i = 1; i <= pages; i++) {
		let raw = null;
		try {
			raw = await request(`https://technology.nasa.gov/svr/search.php?d=/public_domain&p=${i}`);
		}
		catch (e) {
			continue;
		}

		let data = JSON.parse(raw);
		for (let key in data.results) {
			results.push(await processItem(`https://technology.nasa.gov/svr/search.php?d=public_domain&r=geturl&q=${data.results[key][1]}`));
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
	console.warn(data.results[0].id);
	return {
		title: data.results[0].title,
		summary: data.results[0].abstract,
		id: data.results[0].id,
		patent_number: data.results[0].patent_number,
	};
}
