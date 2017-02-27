/* eslint-disable no-console */

export class Log {
	constructor() {
		this._data = {};
	}
	
	assure(key) {
		if (!this._data[key]) {
			this._data[key] = {
				time: Date.now(),
				max: null,
				tick: 100,
				count: 0,
			};
		}
	}
	
	setTick(key, tick) {
		this.assure(key);
		this._data[key].tick = Math.max(1, Math.floor(tick));
	}
	
	setMax(key, max) {
		this.assure(key);
		this._data[key].max = max;
		
		this.setTick(key, max / 100);
	}
	
	inc(key) {
		this.assure(key);
		this._data[key].count++;
		
		if ((this._data[key].count % this._data[key].tick === 0) || this._data[key].count === this._data[key].max) {
			let percent = this._getPercent(key);
			let remaining = this._getRemaining(key);
			
			if (percent && remaining) {
				console.warn(`    ${ key }: ${ this._getCount(key) } (${ percent }). Estimated time remaining: ${ remaining }.`);
			}
			else {
				console.warn(`    ${ key }: ${ this._getCount(key) } in ${ this._getElapsed(key) }.`);
			}
		}
	}
	
	_getCount(key, raw = false) {
		if (raw) {
			return this._data[key].count;
		}
		
		return `${ this._getCount(key, true) }`;
	}
	
	_getPercent(key, raw = false) {
		if (!this._data[key].max) {
			return null;
		}
		
		if (raw) {
			return this._data[key].count / this._data[key].max;
		}
		
		return toPercent(this._getPercent(key, true));
	}
	
	_getRemaining(key, raw = false) {
		if (raw) {
			return this._getElapsed(key, true) * (this._data[key].max / this._data[key].count - 1);
		}
		
		return toTime(this._getRemaining(key, true));
	}
	
	_getElapsed(key, raw = false) {
		if (raw) {
			return (Date.now() - this._data[key].time) / 1000;
		}
		
		return toTime(this._getElapsed(key, true));
	}
}

export default new Log();

const DATE_REMAIN = [
	{ unit: 'second', factor: 60 },
	{ unit: 'minute', factor: 60 },
	{ unit: 'hour', factor: 24 },
	{ unit: 'day', factor: 28 },
	{ unit: 'month', factor: 12 },
	{ unit: 'year' },
];

function toTime(value) {
	for (let { unit, factor } of DATE_REMAIN) {
		if (value < factor || !factor) {
			let count = Math.floor(value);
			if (count !== 1) {
				unit += 's';
			}
			
			return `${ value.toFixed(2) } ${ unit }`;
		}
		
		value /= factor;
	}
	
	return null;
}

function toPercent(value) {
	return `${ (value * 100 ).toFixed(2) }%`;
}
