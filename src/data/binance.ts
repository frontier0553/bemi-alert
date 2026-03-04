export async function fetchTickers(){
 const res = await fetch("https://api.binance.com/api/v3/ticker/24hr")
 return res.json()
}