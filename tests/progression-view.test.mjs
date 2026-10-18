import test from 'node:test';import assert from 'node:assert/strict';
import {parseSave} from '../src/core.mjs';import {missionSet,collectLetter,withCurrentDay} from '../src/progression.mjs';import {progressionPanel,rewardReveal,runProgression,wordTiles} from '../src/progression-view.mjs';
test('mission and daily screens expose completion, both A positions, and offline claim rules',()=>{
 let s=withCurrentDay(parseSave(null));s.progression.counts=missionSet(0).map(m=>m.target);let html=progressionPanel(s,'missions');assert.match(html,/COLLECT & LEVEL UP/);assert.equal((html.match(/class="mission-card complete"/g)||[]).length,3);
 for(let i=0;i<7;i++)s=collectLetter(s,i);html=progressionPanel(s,'hunt',{signedIn:true,offline:true});assert.match(html,/CONNECT TO OPEN/);assert.match(html,/data-claim="daily" disabled/);assert.equal((wordTiles(s).match(/position /g)||[]).length,7);assert.match(html,/MIDNIGHT PKT/);
});
test('reward confirmation escapes remote text and does not render raw remote inventory values',()=>{
 const html=rewardReveal({name:'<img src=x onerror=alert(1)>',coins:500,boards:'<script>',tickets:0},2,'daily');assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.match(html,/&lt;img/);
});
test('run results show gains against the run-start snapshot and route to progression',()=>{
 const s=withCurrentDay(parseSave(null)),start=structuredClone(s.progression);s.progression.counts[0]=12;const html=runProgression(s,start,1);assert.match(html,/\+12 THIS RUN/);assert.match(html,/results-progress/);assert.match(html,/NEW LETTERS FOUND/);
});
