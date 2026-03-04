export function evaluatePumpDump(changePct:number,volumeMult:number,pumpPct:number,dumpPct:number,volThresh:number){
 if(changePct>=pumpPct && volumeMult>=volThresh) return "PUMP"
 if(changePct<=-dumpPct && volumeMult>=volThresh) return "DUMP"
 return null
}