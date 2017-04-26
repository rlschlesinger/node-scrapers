process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import request from 'request-promise-native';
import cheerio from 'cheerio';
import stringify from 'csv-stringify';
import log from './lib/log';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	console.log(await processList('YXDiJk'));
})();

(async function() {
	console.warn('initializing');
	let ids = getIds('http://api.brewerydb.com/v2/breweries?key=a2bde7623cd105327186d4d797913324&region=California&p=1&json')
	console.warn('ids returned');
	let data = [];
	log.setMax('id', ids.length);
	for (let id of ids) {
		let list = await processList(id);
		data = data.concat(list);
		log.inc('category');
	}
	
	stringify(data, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
});

async function processList(id) {
	let raw = null;
	try {
		raw = await request(`http://api.brewerydb.com/v2/brewery/${id}/beers?key=a2bde7623cd105327186d4d797913324&json`);
	}
	catch (e) {
		return [];
	}

	let data = JSON.parse(raw);
	let breweryInfo = getBrewery(id);
	
	let results = [];
	
	for (let each in data.data) {
		results.push({
			name: data.data[each].name,
			style: data.data[each].style.name,
			ibu: ((data.data[each].style.ibuMax + data.data[each].style.ibuMin) / 2),
			abv: ((data.data[each].style.abvMax + data.data[each].style.abvMin) / 2),
			brewery: breweryInfo.name,
			address: breweryInfo.address,
			city: breweryInfo.city,
			state: 'CA',
			zip: breweryInfo.zip,
			lat: breweryInfo.lat,
			long: breweryInfo.long,
		});
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

async function getIds(url) {
	let data = await parseUrl(url);
	let list = [];
	let page = data.currentPage;
	let pageMax = data.numberOfPages;

	console.log(pageMax);

	for (page; page < (pageMax + 1); page++) {
		data = await parseUrl(`http://api.brewerydb.com/v2/breweries?key=a2bde7623cd105327186d4d797913324&region=California&p=${page}&json`);
		for (let each in data.data) {
			list.push(data.data[each].id)
		}
	}

	return list;
}

async function parseUrl(url, key = null) {
	console.warn('Parsing URL');
	try {
		let raw = await request(url);
		let data = JSON.parse(raw);
		console.warn('URL Parsed');
		if (key) {
			return data[key];
		}
		return data;
	}
	
	catch (e) {
		return null;
	}
}

async function getBrewery(id) {
	let raw = null;
	try {
		raw = await request(`http://api.brewerydb.com/v2/brewery/${id}?key=a2bde7623cd105327186d4d797913324&json`);
	}
	catch (e) {
		return null;
	}
	console.log(id);
	process.exit();
	let data = JSON.parse(raw);
	console.log(data.data.name);
	
	let location = getLocation(id);
	
	return {
		name: data.data.name,
		address: location.address,
		city: location.city,
		zip: location.zip,
		lat: location.lat,
		long: location.long,
	};
}

async function getLocation(id) {
	let raw = null;
	try {
		raw = await request(`http://api.brewerydb.com/v2/brewery/${id}/locations?key=a2bde7623cd105327186d4d797913324&json`);
	}
	catch (e) {
		return null;
	}
	
	let data = JSON.parse(raw);
	
	return {
		address: data.data.streetAddress,
		city: data.data.locality,
		zip: data.data.postalCode,
		lat: data.data.latitude,
		long: data.data.longitude,
	};
}