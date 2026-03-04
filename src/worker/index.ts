import {runScanOnce} from '../data/scanner'

async function main(){
 console.log("Bemi worker started")
 while(true){
  await runScanOnce()
  await new Promise(r=>setTimeout(r,60000))
 }
}

main()