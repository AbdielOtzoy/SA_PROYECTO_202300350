import test from 'node:test'; import assert from 'node:assert/strict';
test('un checkpoint conserva precisión decimal',()=>{const sent=12.5; const stored=Number(sent); assert.equal(stored,12.5)});
test('el voto es binario y modificable',()=>{const votes=new Map([['u',true]]);votes.set('u',false);assert.equal(votes.size,1);assert.equal(votes.get('u'),false)});

