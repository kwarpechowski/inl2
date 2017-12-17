const csv = require('fast-csv');
const fs = require('fs');
const shuffle = require('shuffle-array');

const stream = fs.createReadStream('dataset_1000.csv');
const rows = [];


const findSimilarity = (s1, s2) => {
    s1.forEach((word, index) => {
      console.log(word, s2.indexOf(word), s2);
    })
};

const startLearning = () => {
  shuffle(rows);
  const size = rows.length * 0.9;
  //const size = 1;
  const learningRows = rows.splice(0, size);

  learningRows
    .map(row => ({
      sentence1: new Set(row.r1.replace('.', '').split(' ')),
      sentence2: new Set(row.r2.replace('.', '').split(' ')),
      sum: parseInt(row.sum, 10)
    }))
    .forEach(({sentence1, sentence2, sum}) => {
      let intersection = new Set(
        [...sentence1].filter(x => sentence2.has(x)));
      console.log(sum, intersection.size / sentence1.size);
  });
};

csv
  .fromStream(stream, {
    delimiter: '\t',
  })
  .on('data', ([id, sentence1, sentence2, sumpart, sum])=> {
    if(sentence1.length > sentence2.length) {
      rows.push({...{r1: sentence1, r2: sentence2}, sum});
    } else {
      rows.push({...{r1: sentence2, r2: sentence1}, sum});
    }
  })
  .on('end', startLearning);
