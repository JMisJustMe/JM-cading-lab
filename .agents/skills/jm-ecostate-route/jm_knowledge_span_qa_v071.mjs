#!/usr/bin/env node
/**
 * JM v0.7.1 actual pretrained ONNX extractive question-answering contact.
 * The SQuAD-finetuned model selects a span from existing JM-ranked original
 * book context. Gold is not accepted as an input and model outputs are HELD
 * until separate Python original-byte and citation verification.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { pipeline } from "@huggingface/transformers";
const SCHEMA="JM.KnowledgeSpanAnswers/0.7.1";
const MODEL="Xenova/distilbert-base-cased-distilled-squad";
const args=process.argv.slice(2);
const option=key=>{const n=args.indexOf(key);return n<0?null:args[n+1]};
const input=option("--candidates"),out=option("--out");
if(!input||!out||fs.existsSync(out)){console.error("BUGG: missing input or output exists");process.exit(2)}
const fixture=JSON.parse(fs.readFileSync(input,"utf8"));
if(fixture.schema!=="JM.KnowledgeSpanCandidates/0.7.1"||fixture.state!=="HELD"||
 fixture.gold_used_in_candidate!==false||fixture.promotion!=="NOT_ALLOWED"||
 !Array.isArray(fixture.items)||fixture.items.length>40||
 !fixture.items.every(i=>Object.keys(i).sort().join(",")==="candidates,id,question")){
 console.error("BUGG: candidate contract failed");process.exit(2)
}
const model=await pipeline("question-answering",MODEL,{dtype:"q8"});
const outputs=[];
for(const item of fixture.items){
 const attempts=[];
 for(const passage of item.candidates){
   const response=await model(item.question,passage.context);
   const answer=String(response.answer||"").trim();
   const confidence=Number(response.score);
   const matching=passage.lines.filter(x=>x.source.includes(answer)&&answer.length>=5);
   // A decoded answer spanning multiple book lines cannot receive a fabricated
   // single-line citation. Keep as an untrusted rejected candidate.
   attempts.push({
      span:answer,score:Number.isFinite(confidence)?confidence:0,
      verified_line_candidate:matching.length===1?
         {book:passage.source_filename,book_sha256:passage.original_sha256,
          line:matching[0].line,original_line:matching[0].source}:null,
      context_sha256:crypto.createHash("sha256").update(passage.context).digest("hex")
   });
 }
 attempts.sort((a,b)=>b.score-a.score);
 outputs.push({
   id:item.id,question:item.question,
   attempts:attempts.slice(0,8),
   best_index:attempts.findIndex(x=>x.verified_line_candidate!==null && x.score>=.55),
 });
}
const result={schema:SCHEMA,state:"HELD",model:MODEL,
  pretrained_extractive_model:true,generative_llm_calls:0,
  model_fine_tuned_by_JM:false,question_cases:outputs.length,
  candidate_schema:fixture.schema,
  candidate_sha256:crypto.createHash("sha256").update(fs.readFileSync(input)).digest("hex"),
  gold_used_in_prediction:false,promotion:"NOT_ALLOWED",results:outputs};
fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n",{flag:"wx"});
const checksum=crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex");
console.log(JSON.stringify({state:"HELD",cases:outputs.length,model:MODEL,
  predictions:outputs.reduce((n,x)=>n+x.attempts.length,0),
  qualified_candidates:outputs.filter(x=>x.best_index>=0).length,
  receipt_sha256:checksum,score_threshold:.55}));
