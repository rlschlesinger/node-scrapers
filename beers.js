process.on('unhandledRejection', err => console.warn(err));

/* eslint-disable no-console */
import request from 'request-promise-native';
import stringify from 'csv-stringify';

(async function() {
	// console.log(await scrapeDetail('/technology/e-226-2011'));
	// console.log(await processList('YXDiJk'));
});

(async function() {
	let data = [];
	let raw = null;
	let page = 1;
	
	try {
		raw = await request('http://api.brewerydb.com/v2/breweries?key=a2bde7623cd105327186d4d797913324&region=California&p=1&json&withLocations=Y&currentPage=1');
	}
	catch (e) {
		return [];
	}
	let results = JSON.parse(raw);
	
	let pageMax = results.numberOfPages;
	
	for (page; page < (pageMax + 1); page++) {
		results = await parseUrl(`http://api.brewerydb.com/v2/breweries?key=a2bde7623cd105327186d4d797913324&region=California&p=1&json&withLocations=Y&currentPage=${page}`);
		console.log(`http://api.brewerydb.com/v2/breweries?key=a2bde7623cd105327186d4d797913324&region=California&p=1&json&withLocations=Y&currentPage=${page}`);
		for (let each in results.data) {
			let brewery = results.data[each].name;
			let address = results.data[each].locations[0].streetAddress;
			let city = results.data[each].locations[0].locality;
			let state = results.data[each].locations[0].region;
			let zip = results.data[each].locations[0].postalCode;
			let lat = results.data[each].locations[0].latitude;
			let long = results.data[each].locations[0].longitude;
			let beers = await parseUrl(`http://api.brewerydb.com/v2/brewery/${results.data[each].id}/beers?key=a2bde7623cd105327186d4d797913324&json`);
			console.log(`http://api.brewerydb.com/v2/brewery/${results.data[each].id}/beers?key=a2bde7623cd105327186d4d797913324&json`)
			for (let beer in beers.data) {
				if (!beers.data[beer].style) {
					continue;
				}
				data = data.concat({
					beer: beers.data[beer].name,
					style: beers.data[beer].style.name,
					ibu: beers.data[beer].ibu,
					abv: beers.data[beer].abv,
					brewery: brewery,
					address: address,
					city: city,
					state: state,
					zip: zip,
					lat: lat,
					long: long,
				});
			}
			
		}
		console.log(`Page ${page} complete`);
	}
	
	stringify(data, { header: true }, (err, output) => err ? console.warn(err) : console.log(output));
})();

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
