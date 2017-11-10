// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

let bittrex = require('node.bittrex.api')
let krakenAPI = require('@warren-bank/node-kraken-api')
let Web3 = require('web3')
let axios = require('axios')
let moment = require('moment')
const Store = require('./store.js');

const store = new Store({
	configName: 'user-preferences',
	defaults: {
	  ethereum: { address: String },
	  kraken: { apikey: String, secretkey: String},
	  bittrex: { apikey: String, secretkey: String}
	}
 });

web3 = new Web3(new Web3.providers.HttpProvider("https://mainnet.infura.io/tbGNu2K9yH7CrPSalihB"));

const ethereumaddress = store.get('ethereum')
let krakencredentials = store.get('kraken')
let bittrexcredentials = store.get('bittrex')

$('#ethereum-address').val(ethereumaddress.address)
$('#kraken-api-key').val(krakencredentials.apikey)
$('#kraken-secret-key').val(krakencredentials.secretkey)
$('#bittrex-api-key').val(bittrexcredentials.apikey)
$('#bittrex-secret-key').val(bittrexcredentials.secretkey)

let kraken = new krakenAPI(krakencredentials.apikey, krakencredentials.secretkey);

bittrex.options({'apikey': bittrexcredentials.apikey, 'apisecret': bittrexcredentials.secretkey})

$('#icon-refresh').on('click', loadBalances)
$('#save-settings').on('click', savePreferences)

$(document).ready(function() {
	loadBalances()
})

function loadBalances() {
	$('#icon-refresh').addClass('fa-spin')
	$('* > .balances').html('')				
	$('* > .totals > *').html('')		
	$('.summary > *').html('')	
	getBittrexBalances()
	getKrakenBalances()
	getWalletBalances()
	setTimeout(function(){
		var btc = 0
		var eth = 0
		var eur = 0
		$('.totals .btc').each(function() {
			btc += Number($(this).html().match(/\d+((.|,)\d+)?/g)[0])
		})
		$('.totals .eth').each(function() {
			eth += Number($(this).html().match(/\d+((.|,)\d+)?/g)[0])
		})
		$('.totals .eur').each(function() {
			eur += Number($(this).html().match(/\d+((.|,)\d+)?/g)[0])
		})
		$('.summary #fiat_value').html(eur.toFixed(2) + '€')
		$('.summary #btc_value').html(btc.toFixed(6) + 'BTC')
		$('.summary #eth_value').html(eth.toFixed(6) + 'ETH')
		$('#updated').html('<i>Updated ' + moment().fromNow() + '</i>')
		$('#icon-refresh').removeClass('fa-spin')			
  }, 4000);
}

function savePreferences() {
	let ethereumaddress = $('#ethereum-address').val()
	let krakenapikey = $('#kraken-api-key').val()
	let krakensecretkey =  $('#kraken-secret-key').val()
	let bittrexapikey = $('#bittrex-api-key').val()
	let bittrexsecretkey = $('#bittrex-secret-key').val()
	store.set('ethereum', { address: ethereumaddress })
	store.set('kraken', { apikey: krakenapikey, secretkey: krakensecretkey })
	store.set('bittrex', { apikey: bittrexapikey, secretkey: bittrexsecretkey })
}

async function getBittrexBalances() {
	bittrex.getbalances( 
		data => { 
			let bittrexArray = data.result.filter(function(currency) {
				return currency.Balance > 0
			})
			writeBittrexBalances(bittrexArray)
			convertBittrexBalances(bittrexArray)
		}, 
		err => {
			console.log(err)
		}
	)
}

function writeBittrexBalances(balances) {
	const bittrexArray = balances.filter(function(currency) {
		return currency.Balance > 0
	})
	bittrexArray.forEach(function(currency) {
		$('#bittrex .balances').prepend(currency.Currency + ': ' + currency.Balance.toFixed(8) + '<br />')
	})
}

function convertBittrexBalances(balances) {

	let btc = 0
	let eth = 0
	let eur = 0

	axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=BTC')
	.then(function (response) {
		balances.forEach(function(currency) {
			var obj = $.grep(response.data, function(obj){return obj.symbol === currency.Currency;})[0];  
			btc += Number(obj.price_btc) * Number(currency.Available)
		})
		$('#bittrex .totals .btc').html('BTC: ' + btc.toFixed(6))		
	})
	.catch(function (error) {
	  console.log(error);
	});

	axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=ETH')
	.then(function (response) {
		balances.forEach(function(currency) {
			var obj = $.grep(response.data, function(obj){return obj.symbol === currency.Currency;})[0];  
			eth += Number(obj.price_eth) * Number(currency.Available)
		})
		$('#bittrex .totals .eth').html('ETH: ' + eth.toFixed(6))			
	})
	.catch(function (error) {
	  console.log(error);
	});

	axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=EUR')
	.then(function (response) {
		balances.forEach(function(currency) {
			var obj = $.grep(response.data, function(obj){return obj.symbol === currency.Currency;})[0];  
			eur += Number(obj.price_eur) * Number(currency.Available)
		})
		$('#bittrex .totals .eur').html('EUR: ' + eur.toFixed(6))					
	})
	.catch(function (error) {
	  console.log(error);
	});

}

async function getKrakenBalances() {

	let btc = 0
	let eth = 0
	let eur = 0

	let balances = await kraken.api('Balance')
	for (prop in balances) {
		if(balances[prop] > 0) {
			let balance = Number(balances[prop]).toFixed(6)
			$('#kraken .balances').prepend(`${correctName(prop)}: ${balance} <br />`)
		}
	}

	axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=BTC')
	.then(function (response) {
		for (let [key, value] of Object.entries(balances)) {  
			if (correctName(key) == 'EUR') {
				axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=EUR')
				.then(function (response) {
					var obj = $.grep(response.data, function(obj){return obj.symbol === 'BTC';})[0]; 
					btc += Number(value) / Number(obj.price_eur) 
					$('#kraken .totals .btc').html('BTC: ' + btc.toFixed(6))							
				})
				.catch(function (error) {
					console.log(error);
				 });		
			} else {
				var obj = $.grep(response.data, function(obj){return obj.symbol === correctName(key);})[0];  
				btc += Number(obj.price_btc) * Number(value)
			}
		 }
	})
	.catch(function (error) {
	  console.log(error);
	});

	axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=ETH')
	.then(function (response) {
		for (let [key, value] of Object.entries(balances)) {  
			if (correctName(key) == 'EUR') {
				axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=EUR')
				.then(function (response) {
					var obj = $.grep(response.data, function(obj){return obj.symbol === 'ETH';})[0]; 
					eth += Number(value) / Number(obj.price_eur) 
					$('#kraken .totals .eth').html('ETH: ' + eth.toFixed(6))							
				})
				.catch(function (error) {
					console.log(error);
				 });		
			} else {
				var obj = $.grep(response.data, function(obj){return obj.symbol === correctName(key);})[0];  
				eth += Number(obj.price_eth) * Number(value)
			}
		 }
	})
	.catch(function (error) {
	  console.log(error);
	});

	axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=EUR')
	.then(function (response) {
		for (let [key, value] of Object.entries(balances)) {  
			if (correctName(key) == 'EUR') {
				eur += Number(value) 
			} else {
				var obj = $.grep(response.data, function(obj){return obj.symbol === correctName(key);})[0];  
				eur += Number(obj.price_eur) * Number(value)
			}
		}
		$('#kraken .totals .eur').html('EUR: ' + eur.toFixed(6))				 
	})
	.catch(function (error) {
	  console.log(error);
	});	
}

async function getWalletBalances() {
	
	let btc = 0
	let eth = 0
	let eur = 0

	let balances = await web3.eth.getBalance(ethereumaddress.address) / 1000000000000000000
	$('#ethereum .balances').prepend('ETH: ' + balances)
	eth = balances

	axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=BTC')
	.then(function (response) {
		var obj = $.grep(response.data, function(obj){return obj.symbol === 'ETH';})[0]; 
		btc = Number(balances) * Number(obj.price_btc) 
		$('#ethereum .totals .btc').html('BTC: ' + btc.toFixed(6))
	})
	.catch(function (error) {
	  console.log(error);
	});

	$('#ethereum .totals .eth').html('ETH: ' + eth.toFixed(6))
	
	axios.get('https://api.coinmarketcap.com/v1/ticker/?convert=EUR')
	.then(function (response) {
		var obj = $.grep(response.data, function(obj){return obj.symbol === 'ETH';})[0]; 
		eur = Number(balances) * Number(obj.price_eur) 
		$('#ethereum .totals .eur').html('EUR: ' + eur.toFixed(6))
	})
	.catch(function (error) {
	  console.log(error);
	});

}

function correctName(name) {

	if (name == 'XICN') {
		name = 'ICN'
	} else if (name == 'XETH') {
		name = 'ETH'
	} else if (name == 'XLTC') {
		name = 'LTC'
	} else if (name == 'XXRP') {
		name = 'XRP'
	} else if (name == 'XXBT') {
		name = 'BTC'
	} else if (name == 'ZEUR') {
		name = 'EUR'
	} 
	
	return name

}
