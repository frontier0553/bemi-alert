export async function fetchTickers(){
 const res = await fetch("https://api.binance.com/api/v3/ticker/24hr")
 if (!res.ok) throw new Error(`Binance HTTP error: ${res.status}`)
 const data = await res.json()
 if (!Array.isArray(data)) throw new Error(`Binance API error: ${JSON.stringify(data)}`)
 return data
}