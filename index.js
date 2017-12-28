const csv = require('fast-csv');
const fs = require('fs');
const shuffle = require('shuffle-array');
const axios = require('axios');
const querystring = require('querystring');

const stream = fs.createReadStream('dataset_1000.csv');
const rows = [];

const getData = async sentence => {
  const a = '["'+ sentence + '"]'
  const url = 'http://clarin.pelcra.pl/apt_pl/?sentences=' + querystring.escape(a);
  const response = await axios.post(url);

  if (response) {
    return response.data.sentences[0]
      .filter(({udt}) => udt !== 'PUNCT')
      .map(({dt, udt, l, ...other})=> {
        return {dt, udt, ...{
            l: l.split(':')[0]
          }};
      });
  }
  return null;
};

function common(arr1, arr2) {
  var newArr = [];
  newArr = arr1.filter(function(v){ return arr2.indexOf(v) >= 0;})
  newArr.concat(arr2.filter(function(v){ return newArr.indexOf(v) >= 0;}));
  return newArr;
}

const findSimilarity =  async (sentence1, sentence2) => {
  const s1 = await getData(sentence1);
  const s2 = await getData(sentence2);

  const [ss1, ss2] = [s1, s2].sort((a,b) => a.length - b.length);

  let sum = 0;

  let fullSs1 = ss1.map(s => s.l).join(' ').toString();
  let fullSs2 = ss2.map(s => s.l).join(' ').toString();

  const avgWords = common(ss1.map(s => s.l), ss2.map(s => s.l)).length / ss1.length;

  // console.log('------');
  // console.log(fullSs1);
  // console.log(fullSs2);
  //
  //
  // console.log('**** ss1');
  // console.log(ss1);
  //
  // console.log('**** ss2');
  // console.log(ss2);
  // console.log('\n\n');

  // szukanie rzeczownikow
  ss1.filter(s => {
    return s.dt.includes('subst');
  }).forEach((p, i) => {

    if (ss2.find(({l}) => l === p.l)) {
      sum += 20;

      const sub = p.dt.replace('subst:', '');

      ss1.filter(({dt}) => dt.includes(sub) && dt !== p.dt).forEach(z => {

        if (fullSs2.indexOf(p.l + ' '+  z.l) >= -1) {
          sum += 5;
        }

        if (fullSs2.indexOf(z.l + ' '+  p.l) >= -1) {
          sum += 5;
        }
      });

      if (fullSs2.indexOf(p.l + ' '+ ss1[i+1].l) >= -1) {
        sum += 10;
      }

      if (fullSs2.indexOf(ss1[i+1].l + ' ' + p.l) >= -1) {
        sum += 10;
      }
    }
  });

  const avg = sum/ss1.length;

  if (sum > 200 || avg >= 16) {
    return 5;
  }

  if (sum > 140 || avg >= 15) {
    return 4;
  }

  if (sum > 120 || avg >= 9) {
    return 3;
  }

  if (sum > 80 || avg >= 5) {
    return 2;
  }

  if (sum > 20 || avgWords > 0.2) {
    return 1;
  }

  return 0;

};

const startLearning = async () => {
  shuffle(rows);
  //const size = rows.length * 0.9;
  const size = rows.length;

  const learningRows = rows.splice(0, size);

  const x = learningRows.map(row => ({
      sentence1: row.r1,
      sentence2: row.r2,
      sum: parseInt(row.sum, 10)
    }));

  let result = 0;
  let part = 0;
  for ({sentence1, sentence2, sum} of x) {
    const respo = await findSimilarity(sentence1, sentence2);
    if (respo === sum) {
      console.log('OK\t', respo, '\t___________\t', sum);
      result +=1;
    } else if (Math.abs(respo - sum) === 1){
      console.log('PART\t', respo, '\tpowinno być\t', sum);
      part += 1;
    } else {
      console.log('BAD\t', respo, '\tpowinno być\t', sum);
    }
  }
  console.log('\n\n\n');
  console.log('w pełni dobre\t', result/size);
  console.log('częściowo dobre\t' part/size);
  console.log('kompletnie złe\t', 1 - (result+part)/size);
  console.log('\n\n\n');
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



