import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import d3Tip from 'd3-tip';
import * as fns from 'date-fns';
import {isLineBreak} from 'codelyzer/angular/sourceMappingVisitor';

@Component({
  selector: 'app-mapchart',
  templateUrl: './mapchart.component.html',
  styleUrls: ['./mapchart.component.css']
})
export class MapchartComponent implements OnInit, AfterViewInit, OnDestroy {
  // svg: any;
  tipCountry: any;
  tipCounty: any;
  tipLineCountyName: any;
  tipLineState: any;
  tipLineCounty: any;
  // iniSelectedDay = '2020-01-01';
  iniSelectedDay = '2020-10-13';
  // minSelectedDay = '2020-02-24';
  minSelectedDay = '2020-02-22';
  endSelectedDay = '2020-03-24';
  maxSelectedDay = '2020-03-24';
  newStatesMaxVal = 0;
  data = {};
  totalCountry = 0;
  totalState = 0;
  totalDeathCountry = 0;
  totalDeathState = 0;
  newCasesCountry = 0;
  newCasesSate = 0;
  newCasesDeathCountry = 0;
  newCasesDeathState = 0;
  rankingStates = [];
  rankingCounties = [];
  listDatesStates = [];
  listDatesCounties = [];
  lineChartCountry = [];
  lineChartStates = [];
  lineChartCounties = [];
  popScale = 100000;
  byDensity = false;
  byDeath = false;
  byTrend = false;
  byNewCases = false;
  byWeek = true;
  maxQtyDayDisplayed = 60;
  globalStatesStep = 0;
  globalCountiesStep = 0;

  // lineBorderColor = 'rgb(0,0,0,0.87)';
  lineBorderColor = '#1d1d1da8';
  lineStrongerBorderColor = '#1d1d1da8';
  // lineStrongerBorderColor = 'rgb(0,0,0,0.87)';
  colorText = '#1d1d1da8';

  slopeLabels = ['Queda', 'Aprox. o mesmo', 'Ascenção (pequena)', 'Ascenção (média)', 'Ascenção (alta)', 'Poucos casos'];

  population = { total: 0 };

  counts = [ 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000, 1000000,
    2000000, 5000000, 10000000, 20000000, 50000000, 100000000, 200000000, 500000000,
    1000000000, 2000000000, 5000000000, 10000000000, 20000000000, 50000000000, 100000000000, 200000000000,
    500000000000
  ];

  countiesByStates = {
    AC: [], AL: [], AM: [], AP: [], BA: [], CE: [], DF: [], ES: [], GO: [], MA: [], MG: [], MS: [], MT: [], PA: [], PB: [], PE: [],
    PI: [], PR: [], RJ: [], RN: [], RO: [], RR: [], RS: [], SC: [], SE: [], SP: [], TO: []
  };

  statesNames = {
    AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo',
    GO: 'Goiás', MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso', PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco',
    PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins'
  };

  countiesNames = {};
  selectedState = 'RS';
  selectedCounty = '4314902';

  yFormat = (n) => {
    if ( n < 1 && n !== 0) {
      return d3.format('.2f')(n);
    }
    return d3.format(',d')(n);
  };

  closestMaxLegend = goal => {
    return this.counts.reduce(function(prev, curr) {
      return Math.abs(curr - goal) < Math.abs(prev - goal) ? curr : prev;
    });
  };

  coloresGoogle = n => {
    const coloresG = [ '#3366cc', '#dc3912', '#ff9900', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00', '#b82e2e',
      '#316395', '#994499', '#22aa99', '#aaaa11', '#6633cc', '#e67300', '#8b0707', '#651067', '#329262', '#5574a6', '#3b3eac'
    ];
    return coloresG[n % coloresG.length];
  };

  constructor() {
    d3.formatDefaultLocale({
      decimal: ',',
      thousands: '.',
      grouping: [3],
      currency: ['R$', '']
    });
  }

  colorScale = (colorRange, legendRange, value) => {
    const color = colorRange[colorRange.length - 1];
    for (let index = 0; index < colorRange.length; index++) {
      if (value >= legendRange[index] && value < legendRange[index + 1]) { return colorRange[index]; }
    }
    return color;
  }

  ngOnInit() {
    const self = this;

    const serieInterval = {
      start: new Date(2020, 1, 20),
      end: new Date()
    };

    Object.keys(this.statesNames).forEach(uf => {
      self.population[uf] = {
        population: 0,
        municipios: {}
      };
    });

    const dateSerie = fns.eachDayOfInterval(serieInterval);

    dateSerie.forEach(d => {
      const date = fns.format(d, 'yyyy-MM-dd');
      self.data[date] = {
        total: 0,
        total_death: 0,
        new_cases: 0,
        new_death_cases: 0,
        estados: {}
      };
      Object.keys(this.statesNames).forEach(uf => {
        self.data[date]['estados'][uf] = {
          total: 0,
          total_death: 0,
          new_cases: 0,
          new_death_cases: 0,
          municipios: {}
        };
      });
    });
    let dataPromises = Object.keys(this.statesNames).map(uf => {
      return d3.dsv(
        ',',
        `https://raw.githubusercontent.com/inf-covid19/covid19-data/master/data/brazil/${uf.toLowerCase()}.csv`,
        function(d) {
          // Filling states data
          if (self.listDatesStates.indexOf(d.date) === -1) {
            self.listDatesStates.push(d.date);
          }
          if (d.place_type === 'city') {
            let munId = d.city_ibge_code;
            if (munId === '') {
              munId = d.city;
            }
            if (
              munId in self.data[d.date]['estados'][d.state]['municipios'] ===
              false
            ) {
              self.data[d.date]['estados'][d.state]['municipios'][munId] = {
                total: 0,
                total_death: 0,
                new_cases: 0,
                new_death_cases: 0
              };
            }
            if (-1 === self.countiesByStates[d.state].indexOf(munId)) {
              self.countiesByStates[d.state].push(munId);
            }
            self.data[d.date]['estados'][d.state]['municipios'][munId]['total'] = parseInt(d.confirmed);
            self.data[d.date]['estados'][d.state]['municipios'][munId]['total_death'] = d.deaths === '' ? 0 : parseInt(d.deaths);
            self.countiesNames[munId] = d.city.split('/')[0];
            if (-1 === self.listDatesCounties.indexOf(d.date)) {
              self.listDatesCounties.push(d.date);
            }
          }
        }
      );
    });

    dataPromises.push(
        d3.dsv( ',', 'https://raw.githubusercontent.com/inf-covid19/dashboard/gh-pages/assets/csv/population.csv',
            function(d) {
              self.population.total += parseInt(d.population);
              self.population[d.state].population += parseInt(d.population);
              self.population[d.state]['municipios'][d.cod_ibge] = parseInt(d.population);
            }
        )
    );
    Promise.all(dataPromises).then(values => {
      dateSerie.slice(1).forEach((d, i) => {
        const date = fns.format(d, 'yyyy-MM-dd');
        const lastDate = fns.format(dateSerie[i], 'yyyy-MM-dd');

        self.data[date].total = 0;
        self.data[date].total_death = 0;

        Object.keys(self.data[date]['estados']).forEach(uf => {
          Object.keys(self.data[lastDate]['estados'][uf]['municipios']).forEach(city => {
              if ( city in self.data[date]['estados'][uf]['municipios'] === false ||
                  (city in self.data[date]['estados'][uf]['municipios'] === true
                      && self.data[date]['estados'][uf]['municipios'][city].total < self.data[lastDate]['estados'][uf]['municipios'][city].total)) {
                const lastValue = self.data[lastDate]['estados'][uf]['municipios'][city];
                self.data[date]['estados'][uf]['municipios'][city] = {
                  ...lastValue
                };
              }
              if ( city in self.data[date]['estados'][uf]['municipios'] === false ||
                  (city in self.data[date]['estados'][uf]['municipios'] === true
                      && self.data[date]['estados'][uf]['municipios'][city].total_death < self.data[lastDate]['estados'][uf]['municipios'][city].total_death)) {
                const lastValue = self.data[lastDate]['estados'][uf]['municipios'][city];
                self.data[date]['estados'][uf]['municipios'][city].total_death = lastValue.total_death;
              }
            }
          );
          let totalState = 0, totalStateDeaths = 0, totalNewCasesState = 0, totalNewDeathCasesState = 0;
          Object.keys(self.data[date]['estados'][uf]['municipios']).forEach(city => {
            const lastCases = typeof self.data[lastDate]['estados'][uf]['municipios'][city] === 'undefined' ? 0 :
                self.data[lastDate]['estados'][uf]['municipios'][city].total;
            const lastDeathCases = typeof self.data[lastDate]['estados'][uf]['municipios'][city] === 'undefined' ? 0 :
                self.data[lastDate]['estados'][uf]['municipios'][city].total_death;
            self.data[date]['estados'][uf]['municipios'][city].new_cases =
                self.data[date]['estados'][uf]['municipios'][city].total - lastCases;
            self.data[date]['estados'][uf]['municipios'][city].new_death_cases =
                self.data[date]['estados'][uf]['municipios'][city].total_death - lastDeathCases;
            totalStateDeaths += self.data[date]['estados'][uf]['municipios'][city].total_death;
            totalState += self.data[date]['estados'][uf]['municipios'][city].total;
            totalNewCasesState += self.data[date]['estados'][uf]['municipios'][city].new_cases;
            totalNewDeathCasesState += self.data[date]['estados'][uf]['municipios'][city].new_death_cases;
          });
          self.data[date]['estados'][uf].total = totalState;
          self.data[date]['estados'][uf].total_death = totalStateDeaths;
          self.data[date]['estados'][uf].new_cases = totalNewCasesState;
          self.data[date]['estados'][uf].new_death_cases = totalNewDeathCasesState;
          self.data[date].total += totalState;
          self.data[date].total_death += totalStateDeaths;
          self.data[date].new_cases += totalNewCasesState;
          self.data[date].new_death_cases += totalNewDeathCasesState;
        });
      });

      self.listDatesStates.sort();
      self.listDatesCounties.sort();

      self.maxSelectedDay = self.listDatesStates[self.listDatesStates.length - 1];
      self.iniSelectedDay = self.minSelectedDay;
      self.endSelectedDay = self.maxSelectedDay;

      self.listDatesStates = [];
      self.listDatesCounties = [];
      let i = 0;
      while (true) {
        const temp = d3.timeFormat('%Y-%m-%d')(
          d3
            .timeParse('%Y-%m-%d')(self.minSelectedDay)
            .valueOf() +
            24 * 60 * 60 * 1000 * i
        );
        self.listDatesStates.push(temp);
        if (temp === self.maxSelectedDay) {
          break;
        }
        i = i + 1;
      }
      i = 0;
      while (true) {
        const temp = d3.timeFormat('%Y-%m-%d')(
          d3
            .timeParse('%Y-%m-%d')(self.minSelectedDay)
            .valueOf() +
            24 * 60 * 60 * 1000 * i
        );
        self.listDatesCounties.push(temp);
        if (temp === self.maxSelectedDay) {
          break;
        }
        i = i + 1;
      }

      // tslint:disable-next-line:no-shadowed-variable
      for (let i = 3; i < self.listDatesStates.length; i++) {
        if (typeof self.data[self.listDatesStates[i]] === 'undefined') {
          self.data[self.listDatesStates[i]] =
            self.data[self.listDatesStates[i - 1]];
        }
      }

      // self.loadRangeSliderTime();
      self.loadResizeWindow();

      d3.select('#byTrendCheckBox').on( 'change', self.onByTrendCheckBoxChange );
      d3.select('#byDeathsCheckBox').on( 'change', self.onByDeathsCheckBoxChange );
      d3.select('#byDensidadeCheckBox').on( 'change', self.onByDensidadeCheckBoxChange );
      d3.select('#byNewCasesCheckBox').on( 'change', self.onByNewCasesCheckBoxChange );
    });
  }

  loadRangeSliderTime = () => {
    const self = this;
    const parseDate = d3.timeParse('%Y-%m-%d');
    const formatTime = d3.timeFormat('%Y-%m-%d');
    const formatTimeFront = d3.timeFormat('%d/%m');
    const iniDate = new Date(parseDate(self.minSelectedDay)).valueOf();
    const endDate = new Date(parseDate(self.maxSelectedDay)).valueOf();

    d3.select('#date-slider').selectAll('*').remove();
    let container = d3.select('#date-slider').node() as any;
    container = container.parentNode.parentNode.getBoundingClientRect();
    const margin = { top: 0, right: 6, bottom: 35, left: 6 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    const x = d3
      .scaleTime()
      .domain([iniDate, endDate])
      .rangeRound([margin.left, width - margin.right]);

    const xT = d3.scaleLinear().range([0, width]),
      yT = d3.randomNormal(height / 2, height / 8);

    const svg = d3
      .select('#date-slider')
      .attr('viewBox', '0 0 ' + width + ' ' + height);

    svg.append('g')
      .attr('class', 'axis axis--grid')
      .attr('transform', 'translate(0,' + height + ')')
      .call(d3.axisBottom(x)
          // .ticks(d3.timeHour, 24)
          .ticks(d3.timeWeek, 1)
          .tickSize(-height)
          .tickFormat(function() { return null; })
      )
      .selectAll('.tick')
      .classed('tick--minor', function(d) {
        return d.getHours();
      });

    svg
      .append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + height + ')')
      .attr('text-anchor', null)
      .selectAll('text')
      .attr('x', 6);

    const dataT = d3.range(800).map(Math.random);
    const circle = svg
      .append('g')
      .attr('class', 'circle')
      .selectAll('circle')
      .data(dataT)
      .enter()
      .append('circle')
      .attr('transform', function(d) {
        return 'translate(' + xT(d) + ',' + yT() + ')';
      })
      .attr('r', 0);

    const brush = d3.brushX()
      .extent([[0, 0], [width - margin.right, height]])
      .on('brush', onbrush)
      .on('end', brushended);

    const gBrush = svg
      .append('g')
      .attr('class', 'brush')
      .call(brush);

    const brushResizePath = function(d) {
      const e = +(d.type === 'e'), x = e ? 1 : -1, y = height;
      return ('M' + 0.5 * x + ',' + y + 'A6,6 0 0 ' + e + ' ' + 6.5 * x + ',' + (y + 6) + 'V' + (2 * y - 6) +
        'A6,6 0 0 ' + e + ' ' + 0.5 * x + ',' + 2 * y + 'Z' + 'M' + 2.5 * x + ',' + (y + 8) + 'V' + (2 * y - 8) + 'M' + 4.5 * x + ',' +
        (y + 8) + 'V' + (2 * y - 8)
      );
    };

    const handle = gBrush
      .selectAll('.handle--custom')
      .data([{ type: 'w' }, { type: 'e' }])
      .enter()
      .append('path')
      .attr('class', 'handle--custom')
      .attr('stroke', self.lineBorderColor)
      .attr('fill', self.lineBorderColor)
      .attr('cursor', 'ew-resize')
      .attr('d', brushResizePath);

    function onbrush() {
      const s = d3.event.selection,
        d0 = d3.event.selection.map(x.invert),
        d1 = d0.map(d3.timeDay.round);

      if (d1[0] >= d1[1]) {
        d1[0] = d3.timeDay.floor(d0[0]);
        d1[1] = d3.timeDay.offset(d1[0]);
      }

      circle.classed('active', function(d) {
        return d0[0] <= d && d <= d0[1];
      });
      handle.attr('display', null).attr('transform', function(d, i) {
        return 'translate(' + [s[i], -height] + ')';
      });

      d3.select('#label-date-ini').html(
        '<text style="font-weight: 800; font-size: min(2.1vh, 2.1vw);">' + formatTimeFront(d1[0]) + '</text>'
      );
      d3.select('#label-date-end').html(
        '<text style="font-weight: 800; font-size: min(2.1vh, 2.1vw);">' + formatTimeFront(d1[1]) + '</text>'
      );
    }

    function brushended() {
      if (!d3.event.sourceEvent) {
        return;
      } // Only transition after input.
      if (!d3.event.selection) {
        return;
      } // Ignore empty selections.
      const d0 = d3.event.selection.map(x.invert),
        d1 = d0.map(d3.timeDay.round);

      // If empty when rounded, use floor & ceil instead.
      if (d1[0] >= d1[1]) {
        d1[0] = d3.timeDay.floor(d0[0]);
        d1[1] = d3.timeDay.offset(d1[0]);
      }

      d3.select('#label-date-ini').html(
        '<text style="font-weight: 800; font-size: min(2.1vh, 2.1vw);">' + formatTimeFront(d1[0]) + '</text>'
      );
      d3.select('#label-date-end').html(
        '<text style="font-weight: 800; font-size: min(2.1vh, 2.1vw);">' + formatTimeFront(d1[1]) + '</text>'
      );
      d3.select(this)
        .transition()
        .call(d3.event.target.move, d1.map(x));
      self.iniSelectedDay = formatTime(d1[0]);
      self.endSelectedDay = formatTime(d1[1]);

      let diffDates = (new Date(parseDate(self.endSelectedDay))).getTime() - (new Date(parseDate(self.iniSelectedDay))).getTime();
      if (diffDates / (1000 * 3600 * 24) > self.maxQtyDayDisplayed) {
        self.byWeek = true;
      }else {
        self.byWeek = false;
      }

      self.loadWidgetCountry(self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
      self.loadWidgetState(self.selectedState, self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
    }
    const currIniDate = new Date(parseDate(self.iniSelectedDay)).valueOf();
    const currEndDate = new Date(parseDate(self.endSelectedDay)).valueOf();
    gBrush.call(brush.move, [currIniDate, currEndDate].map(x));
  };

  loadResizeWindow = () => {
    const self = this;
    self.loadRangeSliderTime();
    self.loadWidgetCountry( self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
    self.loadWidgetState( self.selectedState, self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
  }

  onByTrendCheckBoxChange = () => {
    const self = this;
    self.byTrend = false;
    if (d3.select('#byTrendCheckBox').property('checked')) {
      self.byTrend = true;
    }
    self.loadWidgetCountry(self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
    self.loadWidgetState(self.selectedState, self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
  };

  onByDeathsCheckBoxChange = () => {
    const self = this;
    self.byDeath = false;
    if (d3.select('#byDeathsCheckBox').property('checked')) {
      self.byDeath = true;
    }
      self.loadWidgetCountry(self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
      self.loadWidgetState(self.selectedState, self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
  };

  onByDensidadeCheckBoxChange = () => {
    const self = this;
    self.byDensity = false;
    if (d3.select('#byDensidadeCheckBox').property('checked')) {
      self.byDensity = true
    }
    self.loadWidgetCountry(self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
    self.loadWidgetState(self.selectedState, self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
  };

  onByNewCasesCheckBoxChange = () => {
    const self = this;
    self.byNewCases = false;
    if (d3.select('#byNewCasesCheckBox').property('checked')) {
      self.byNewCases = true;
    }
    self.loadWidgetCountry(self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
    self.loadWidgetState(self.selectedState, self.byTrend, self.byDeath, self.byDensity, self.byNewCases);
  };

  getPlasmaList = cant => {
    /*const rangeColor = [];
    for (let i = 0; i < cant; i++) {
      rangeColor.push(d3.interpolateViridis(i / (cant - 1)));
    }
    return rangeColor;*/

    return ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb',
      '#41b6c4', '#1d91c0', '#225ea8', '#253494',
      '#081d58'];
  };

  getTrendColorList = () => {
    return ['#badee8', '#f2df91', '#ffae43', '#ff6e0b',
      '#ce0a05', '#f2f2f2'
    ];
  };

  formatValueSeperator = n => {
    if (d3.select('#byDensidadeCheckBox').property('checked')) {
      return d3.format(',.2f')(n);
    } else {
      return d3.format(',d')(n);
    }
  };

  getSlopeValue = (axisX, axisY, minValueAllowed = 2) => {
    // console.log(axisY);
    if (axisX.reduce((a, b) => a + b, 0) < minValueAllowed) { return 6; }
    const maxValue = Math.max.apply(Math, axisX);
    const minValue = Math.min.apply(Math, axisX);
    const ratio = (maxValue - minValue) / 130;
    axisX = axisX.map(function (v) {
      return (v - minValue) / ratio;
    });
    // console.log(axisX);
    let sumX = 0,  sumY = 0;
    let sumXY = 0, sumXX = 0;
    let count = 0;
    // let undefinedVariable;
    let x = 0, y = 0;
    const valuesLength = axisX.length;

    if (valuesLength < 14) { return 6; }

    for (let v = 0; v < valuesLength; v++) {
      x = axisX[v];
      y = axisY[v];
      sumX += x;
      sumY += y;
      sumXX += x * x;
      sumXY += x * y;
      count++;
    }
    // y = x * m + b
    let m = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
    if ( m < -0.1) { m = 1; }
    else {
      if ( m < 0.1 ) { m = 2; }
      else {
        if ( m < 0.4 ) { m = 3; }
        else {
          if ( m < 0.65 ) { m = 4; }
          else { m = 5; }
        }
      }
    }
    // const b = (sumY / count) - (m * sumX) / count;
    return m;
  };

  loadWidgetCountry = (byTrend = false, byDeaths = false, byDensity = false, byNewCases = false) => {
    const self = this;
    let container = d3.select('#svg-country').node() as any;
    //
    if (
      container === (undefined || null) ||
      container.parentNode === (undefined || null)
    ) {
      return;
    }
    container = container.parentNode.parentNode.parentNode.getBoundingClientRect();
    const margin = { top: 5, right: 5, bottom: 35, left: 35 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    d3.select('#svg-country').selectAll('*').remove();

    const svg = d3
      .select('#svg-country')
        .style('padding-left', '6px')
      .attr(
        'viewBox',
        '0 0 ' + container.width * 1.3 + ' ' + container.height * 1.3
      );

    const TotalReport = d3.map();
    const TotalDeathReport = d3.map();
    const TotalReportSlope = d3.map();
    const TotalReportDeathSlope = d3.map();
    const path = d3.geoPath();

    let maxValue = 0;

    const currDate = self.iniSelectedDay;
    const promises = [
      d3.json('./assets/json/coduf.json'),
      new Promise(resolve => {
        self.totalCountry = 0;
        self.totalDeathCountry = 0;
        self.newCasesCountry = 0;
        self.newCasesDeathCountry = 0;
        self.rankingStates = [];
        let population = self.popScale;
        // tslint:disable-next-line:forin
        for (const key in self.countiesByStates) {
          let valorEnd = 0, valorIni = 0, valorDeathIni = 0, valorDeathEnd = 0;
          if (typeof self.data[self.iniSelectedDay] === 'undefined') {
            valorIni = 0;
            valorDeathIni = 0;
          } else {
            valorIni = typeof self.data[currDate]['estados'][key] === 'undefined' ? 0 : self.data[currDate]['estados'][key].total;
            valorDeathIni = typeof self.data[currDate]['estados'][key] === 'undefined' ? 0 : self.data[currDate]['estados'][key].total_death;
          }
          if (typeof self.data[self.endSelectedDay] === 'undefined') {
            valorEnd = 0;
            valorDeathEnd = 0;
          } else {
            valorEnd = typeof self.data[self.endSelectedDay]['estados'][key] === 'undefined' ? 0 : self.data[self.endSelectedDay]['estados'][key].total;
            valorDeathEnd = typeof self.data[self.endSelectedDay]['estados'][key] === 'undefined' ? 0 : self.data[self.endSelectedDay]['estados'][key].total_death;
          }

          if (byTrend === true) {
            if (byDeaths === true) {
              let positionIni = self.listDatesStates.indexOf(self.endSelectedDay) - 14;
              const xValues = [];
              while (positionIni > 0 && self.listDatesStates[positionIni] < self.endSelectedDay) {
                const value = typeof self.data[self.listDatesStates[positionIni]]['estados'][key] === 'undefined' ? 0 : self.data[self.listDatesStates[positionIni]]['estados'][key].new_death_cases;
                xValues.push(value);
                positionIni++;
              }
              const slope = self.getSlopeValue(xValues, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130], 2);
              TotalReportDeathSlope.set(key, slope);
            } else{
              let positionIni = self.listDatesStates.indexOf(self.endSelectedDay) - 14;
              const xValues = [];
              while (positionIni > 0 && self.listDatesStates[positionIni] < self.endSelectedDay) {
                const value = typeof self.data[self.listDatesStates[positionIni]]['estados'][key] === 'undefined' ? 0 : self.data[self.listDatesStates[positionIni]]['estados'][key].new_cases;
                xValues.push(value);
                positionIni++;
              }
              // console.log(key);
              const slope = self.getSlopeValue(xValues, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130], 14);
              TotalReportSlope.set(key, slope);
            }
          }
          // console.log(TotalReportSlope);

          if (byDensity === true) {
            population = self.population[key].population;
          }

          TotalReport.set(key, Math.abs(valorEnd - valorIni) * (self.popScale / population));
          TotalDeathReport.set(key, Math.abs(valorDeathEnd - valorDeathIni) * (self.popScale / population));
          self.totalCountry += Math.abs(valorEnd - valorIni);
          self.totalDeathCountry += Math.abs(valorDeathEnd - valorDeathIni);

          if (byDeaths === true) {
              maxValue = Math.max(maxValue, Math.abs(valorDeathEnd - valorDeathIni) * (self.popScale / population));
              self.rankingStates.push({ region: key, name: self.statesNames[key],
                value: Math.abs(valorDeathEnd - valorDeathIni) * (self.popScale / population)
              });
          } else {
              maxValue = Math.max(maxValue, Math.abs(valorEnd - valorIni) * (self.popScale / population));
              self.rankingStates.push({ region: key, name: self.statesNames[key],
                value: Math.abs(valorEnd - valorIni) * (self.popScale / population)
              });
          }
        }

        // console.log(TotalReportSlope);
        // console.log(TotalReportDeathSlope);

        if ( byDensity === true ) {
          self.totalCountry = self.totalCountry * (self.popScale / self.population.total);
          self.totalDeathCountry = self.totalDeathCountry * (self.popScale / self.population.total);
          self.newCasesCountry = self.newCasesCountry * (self.popScale / self.population.total);
          self.newCasesDeathCountry = self.newCasesDeathCountry * (self.popScale / self.population.total);
        }

        resolve(true);
      })
    ];

    Promise.all(promises).then(ready);

    self.newStatesMaxVal = self.closestMaxLegend(maxValue / 1.5);
    const stepSize = self.newStatesMaxVal / 10;
    self.globalStatesStep = stepSize;
    const yLegend = d3.scaleLinear().domain(
        d3.range(stepSize === 1 ? 1 : stepSize + 1, Math.max(stepSize * 10, 9), stepSize).reverse()
      ).rangeRound([58, 88]);

    let colorRangePlasma = self.getPlasmaList(9);
    if (byTrend === true) { colorRangePlasma = self.getTrendColorList(); }
    const color = d3.scaleThreshold().domain(
        d3.range(stepSize === 1 ? 1 : stepSize + 1, Math.max(stepSize * 10, 9), stepSize)
      ).range(colorRangePlasma);

      const mapG = d3.select('#svg-country').append('g');
    function ready([coduf]) {
      const scaleRatio = Math.min(width / 700, height / 700);

      mapG
        .attr('id', 'country-g-map')
        .attr('transform', 'scale(' + scaleRatio + ')')
        .attr('class', 'counties')
        .selectAll('path')
        .data(coduf.features)
        .enter()
        .append('path')
        .attr('fill', d => {
          let estColor = 0;
          if (byTrend === true) {
            if (byDeaths === true)
              estColor = typeof TotalReportDeathSlope.get(d.properties.UF_05) === 'undefined' ? 0 : TotalReportDeathSlope.get(d.properties.UF_05);
            else
              estColor = typeof TotalReportSlope.get(d.properties.UF_05) === 'undefined' ? 0 : TotalReportSlope.get(d.properties.UF_05);
            return self.colorScale(colorRangePlasma, [1, 2, 3, 4, 5, 6], estColor);
          } else {
            if (byDeaths === true)
                estColor = typeof TotalDeathReport.get(d.properties.UF_05) === 'undefined' ? 0 : TotalDeathReport.get(d.properties.UF_05);
            else
                estColor = typeof TotalReport.get(d.properties.UF_05) === 'undefined' ? 0 : TotalReport.get(d.properties.UF_05);
          }
          if (estColor === 0) {
            // return '#000000';
            return '#FFFFFF';
          }
          return color(estColor);
        })
        .attr('stroke', self.lineBorderColor)
        .attr('d', path)
        .on('mouseover', self.tipCountry.show)
        .on('mouseout', function() {
          d3.selectAll('#country-g-map path').each(function(d) {
            if (d3.select(this).attr('selected') !== 'true') {
              d3.select(this).attr('stroke', self.lineBorderColor);
              d3.select(this).attr('stroke-width', 1);
            }
          });
          self.tipCountry.hide();
        })
        .on('click', function(d) {
          d3.selectAll('#country-g-map path').each(function() {
              d3.select(this).attr('stroke', self.lineBorderColor);
              d3.select(this).attr('stroke-width', 2);
              d3.select(this).attr('selected', 'false');
          });
          self.selectedState = d.properties.UF_05;
            self.loadWidgetState(self.selectedState, byTrend, byDeaths, byDensity, byNewCases);
          d3.select(this)
              .attr('stroke', self.lineStrongerBorderColor)
              // .attr('stroke', '#ED881A')
              .attr('stroke-width', 5)
              .attr('selected', 'true');

        });

      const widthTrans = Math.abs(container.width - mapG.node().getBoundingClientRect().width) / 1.3;
      const heightTrans = Math.abs(container.height - mapG.node().getBoundingClientRect().height) / 2;
      mapG.attr('transform', 'translate( ' + widthTrans + ' , ' + heightTrans + ') scale(' + scaleRatio + ')');

      d3.selectAll('#country-g-map path').each(function(d) {
        if (d.properties.UF_05 === self.selectedState) {
          d3.select(this)
              .attr('stroke', self.lineStrongerBorderColor)
              // .attr('stroke', '#ED881A')
              .attr('stroke-width', 5)
              .attr('selected', 'true');
        }
      });
    }

    self.tipCountry = d3Tip();
    self.tipCountry.attr('class', 'd3-tip')
        .offset([100, 120])
        .html(function(d) {
          const selfTemp = this;
          d3.selectAll('#country-g-map path').each(function() {
            if (d3.select(this).attr('selected') !== 'true' && this === selfTemp) {
              d3.select(this).attr('stroke', self.lineStrongerBorderColor);
              // d3.select(this).attr('stroke', '#ED881A');
              d3.select(this).attr('stroke-width', 3);
            }
          });

          let labelTot = '';
          const qtyTotal = (typeof TotalReport.get(d.properties.UF_05) === 'undefined' ? 0 : self.formatValueSeperator(TotalReport.get(d.properties.UF_05)))
            if (byDensity === true) {
              labelTot = 'Incidência casos';
            } else {
              labelTot = 'Total casos';
            }
          let labelTotDeath = '';
          const qtyTotalDeath = (typeof TotalDeathReport.get(d.properties.UF_05) === 'undefined' ? 0 : self.formatValueSeperator(TotalDeathReport.get(d.properties.UF_05)))
          if (byDensity === true) {
            labelTotDeath = 'Incidência óbitos';
          } else {
            labelTotDeath = 'Total óbitos';
          }

          return (
            '<div style="opacity:0.8;background-color:#253494;padding:7px;color:white">' +
            '<text>Estado: </text><text style="font-weight: 800">' +
            d.properties.NOME_UF +
            '</text><br/>' +
            '<text>' + labelTot + ': </text><text style="font-weight: 800">' +
            qtyTotal  +
            '</text><br/>' +
            '<text>' + labelTotDeath + ': </text><text style="font-weight: 800">' +
            qtyTotalDeath +
            '</text><br/>' +
            '<text>População: </text><text style="font-weight: 800">' +
              d3.format(',d')(self.population[d.properties.UF_05].population) +
            '</text><br/>' +
            '</div>'
          );
        });

    /*const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on('zoom', function() {
        mapG.selectAll('path').attr('transform', d3.event.transform);
      });

    svg.call(zoom);*/

    const g = svg.append('g');
    g.call(self.tipCountry);

    const scaleValue = Math.min((0.5 * height) / 150, (0.5 * width) / 150);
    svg.append('text')
      .attr('x', width / (2 * scaleValue))
      .attr('x', width / 1.7)
      .attr('y', 20)
      .attr('transform', 'scale(' + scaleValue + ')')
      .attr('fill', self.colorText)
      .style('background-color', '#000000')
      .attr('font-family', 'sans-serif')
      .style('font-size', '23px')
      .style('font-weight', 'bold')
      .text('BRASIL');

    g.selectAll('rect')
      .data(
        color.range().map(d => {
          d = color.invertExtent(d);
          if (d[0] == null) {
            d[0] = yLegend.domain()[0];
          }
          if (d[1] == null) {
            d[1] = yLegend.domain()[1];
          }
          return d;
        })
      )
      .enter()
      .append('rect')
      .attr('height', 26)
      .attr('x', -26)
      .attr('y', d => yLegend(d[1]) - 13)
      .attr('width', 23)
      .attr('fill', d => color(d[1] - 1));

    /*legend title*/
    g.append('text')
      .attr('font-family', 'sans-serif')
      .attr('x', -42)
      .attr('y', 20)
      .attr('fill', self.colorText)
      .attr('text-anchor', 'start')
      .attr('font-size', '23px')
      .attr('font-weight', 'bold')
      .text('Casos');

    const currentScale = Math.min(scaleValue, (0.5 * height) / 200);
    let lastTick = 0;
    g.attr(
      'transform',
      'translate(50, ' + (height - 160 * currentScale) + ') scale(' + currentScale + ')'
    )
      .attr('class', 'legend')
      .call(
        d3
          .axisRight(yLegend)
          .tickSize(0)
          // tslint:disable-next-line:only-arrow-functions
          .tickFormat(function(y, i) {
            if (byTrend === true) {
              if (i > 6) { return ''; }
              return self.slopeLabels[i];
            } else {
              if (i > 8) { return ''; }
              if (i === 0) { return '≤' + d3.format(',d')(y - 1) + ''; }
              if (i === 8) { return '≥' + d3.format(',d')(lastTick) + ''; }
              lastTick = y;
              return d3.format(',d')(y - 1) + '';
            }
          })
          .tickValues(color.domain())
      )
      .select('.domain')
      .remove();

      d3.select('#total-country').html( self.formatValueSeperator(self.totalCountry) );
      d3.select('#total-country-deaths').html( self.formatValueSeperator(self.totalDeathCountry) );

    if (byDensity === true) {
      d3.select('#name-total-country').html('Incidência Brasil');
    } else {
      d3.select('#name-total-country').html('Confirmados Brasil');
    }

    const statesRankingElmnt = d3.select('#states-ranking');
    statesRankingElmnt.selectAll('*').remove();

    self.rankingStates.sort((a, b) => (a.value < b.value ? 1 : -1));

    const classColor = byDeaths === false ? 'gt-number' : 'gt-dark-number';
    // tslint:disable-next-line:forin
    for (const item in self.rankingStates) {
      // if (justOneRecord) {
      statesRankingElmnt
        .append('tr')
        .on('mouseover', function() {
          d3.select(this).style('cursor', 'pointer');
          d3.select(this).style('font-weight', '800');
        })
        .on('mouseout', function() {
          d3.select(this).style('font-weight', '300');
        })
        .on('click', function() {
          self.selectedState = self.rankingStates[item].region;
            self.loadWidgetCountry(byTrend, byDeaths, byDensity, byNewCases); // without event click on counties map
            self.loadWidgetState(self.rankingStates[item].region, byTrend, byDeaths, byDensity, byNewCases); // without event click on counties map
        })
        .html(
          '<td class="' + classColor + ' gt-ranking-number"  style="padding-left: 11px; text-align: right">' +
          self.formatValueSeperator(self.rankingStates[item].value) +
          '</td><td>' + self.rankingStates[item].name + '</td>'
        );
    }
      self.loadStatesHeatMapChart(self.iniSelectedDay, self.endSelectedDay, byDeaths, byDensity, byNewCases);
  };

  loadWidgetState = (stateParam, byTrend = false, byDeaths = false, byDensity = false, byNewCases = false) => {
    const self = this;
    let container = d3.select('#svg-county').node() as any;
    //
    if (
      container === (undefined || null) ||
      container.parentNode === (undefined || null)
    ) {
      return;
    }
    container = container.parentNode.parentNode.getBoundingClientRect();
    const margin = { top: 5, right: 5, bottom: 35, left: 35 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    d3.select('#svg-county').selectAll('*').remove();

    const svg = d3.select('#svg-county')
        .style('padding-left', '6px')
        .attr('viewBox', '0 0 ' + container.width * 1.3 + ' ' + container.height * 1.3);

    const TotalReport = d3.map();
    const TotalDeathReport = d3.map();
    const TotalReportSlope = d3.map();
    const TotalReportDeathSlope = d3.map();
    const path = d3.geoPath();
    let maxValue = 0;

    const promises = [
      d3.json('./assets/json/ufs/' + stateParam + '_trans.json'),
      new Promise(resolve => {
        self.rankingCounties = [];
        self.totalState = 0;
        self.totalDeathState = 0;
        const beginDay = self.iniSelectedDay;
        const lastDay = self.endSelectedDay;
        let population = self.popScale;
        self.countiesByStates[stateParam].forEach(function(key, index) {
          let valorEnd = 0, valorIni = 0, valorDeathEnd = 0, valorDeathIni = 0;
          if (typeof self.data[beginDay] === 'undefined') {
            valorIni = 0;
            valorDeathIni = 0;
          } else {
            if ( typeof self.data[beginDay]['estados'][stateParam] === 'undefined' ) {
              valorIni = 0;
              valorDeathIni = 0;
            } else {
              valorIni = typeof self.data[beginDay]['estados'][stateParam]['municipios'][key] === 'undefined' ? 0 : self.data[beginDay]['estados'][stateParam]['municipios'][key].total;
              valorDeathIni = typeof self.data[beginDay]['estados'][stateParam]['municipios'][key] === 'undefined' ? 0 : self.data[beginDay]['estados'][stateParam]['municipios'][key].total_death;
            }
          }
          if (typeof self.data[lastDay] === 'undefined') {
            valorEnd = 0;
            valorDeathEnd = 0;
          } else {
            if (typeof self.data[lastDay]['estados'][stateParam] === 'undefined') {
              valorEnd = 0;
              valorDeathEnd = 0;
            } else {
              valorEnd = typeof self.data[lastDay]['estados'][stateParam]['municipios'][key] === 'undefined' ? 0 : self.data[lastDay]['estados'][stateParam]['municipios'][key].total;
              valorDeathEnd = typeof self.data[lastDay]['estados'][stateParam]['municipios'][key] === 'undefined' ? 0 : self.data[lastDay]['estados'][stateParam]['municipios'][key].total_death;
            }
          }

          if (byTrend === true) {
            if (byDeaths === true) {
              let positionIni = self.listDatesStates.indexOf(self.endSelectedDay) - 14;
              const xValues = [];
              while (positionIni > 0 && self.listDatesStates[positionIni] < self.endSelectedDay) {
                const value = typeof self.data[self.listDatesStates[positionIni]]['estados'][stateParam]['municipios'][key] === 'undefined' ? 0 : self.data[self.listDatesStates[positionIni]]['estados'][stateParam]['municipios'][key].new_death_cases;
                xValues.push(value);
                positionIni++;
              }
              const slope = self.getSlopeValue(xValues, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130], 3);
              TotalReportDeathSlope.set(key, slope);
            } else{
              let positionIni = self.listDatesStates.indexOf(self.endSelectedDay) - 14;
              const xValues = [];
              while (positionIni > 0 && self.listDatesStates[positionIni] < self.endSelectedDay) {
                const value = typeof self.data[self.listDatesStates[positionIni]]['estados'][stateParam]['municipios'][key] === 'undefined' ? 0 : self.data[self.listDatesStates[positionIni]]['estados'][stateParam]['municipios'][key].new_cases;
                xValues.push(value);
                positionIni++;
              }
              // console.log(key);
              const slope = self.getSlopeValue(xValues, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130], 14);
              TotalReportSlope.set(key, slope);
            }
          }

          if (byDensity === true) {
            population = typeof self.population[stateParam]['municipios'][key] === 'undefined' ? 1000000 :
                self.population[stateParam]['municipios'][key];
          }
          TotalReport.set(key, Math.abs(valorEnd - valorIni) * (self.popScale / population));
          TotalDeathReport.set(key, Math.abs(valorDeathEnd - valorDeathIni) * (self.popScale / population));
          self.totalState += Math.abs(valorEnd - valorIni);
          self.totalDeathState += Math.abs(valorDeathEnd - valorDeathIni);
          if (byDeaths === true) {
            maxValue = Math.max(maxValue, Math.abs(valorDeathEnd - valorDeathIni) * (self.popScale / population));
            self.rankingCounties.push({ ibge: key, name: self.countiesNames[key],
              value: Math.abs(valorDeathEnd - valorDeathIni) * (self.popScale / population)
            });
          } else {
            maxValue = Math.max(maxValue, Math.abs(valorEnd - valorIni) * (self.popScale / population));
            self.rankingCounties.push({ ibge: key, name: self.countiesNames[key],
              value: Math.abs(valorEnd - valorIni) * (self.popScale / population)
            });
          }
        });
        if (byDensity === true) {
          self.totalState = self.totalState * (self.popScale / self.population[stateParam].population);
          self.totalDeathState = self.totalDeathState * (self.popScale / self.population[stateParam].population);
        }
        resolve(true);
      })
    ];

    Promise.all(promises).then(ready);
    const newMaxVal = self.closestMaxLegend(maxValue / 1.5);
    const stepSize = newMaxVal / 10;

    self.globalCountiesStep = stepSize;

    const yLegend = d3
      .scaleLinear()
      .domain(
        d3
          .range(
            stepSize === 1 ? 1 : stepSize + 1,
            Math.max(stepSize * 10, 9),
            stepSize
          )
          .reverse()
      )
      .rangeRound([58, 88]);

    // @ts-ignore
    let colorRangePlasma = self.getPlasmaList(9);
    if (byTrend === true) { colorRangePlasma = self.getTrendColorList(); }
    const color = d3
      .scaleThreshold()
      .domain(
        d3.range(
          stepSize === 1 ? 1 : stepSize + 1,
          Math.max(stepSize * 10, 9),
          stepSize
        )
      )
      .range(colorRangePlasma);

    const mapG = d3.select('#svg-county').append('g');
    function ready([counties]) {
      const scaleRatio = Math.min(width / 550, height / 550);
      mapG
        .attr('class', 'counties')
        .attr('id', 'county-g-map')
        .attr('transform', 'scale(' + scaleRatio + ')')
        .selectAll('path')
        .data(counties.features)
        .enter()
        .append('path')
        .attr('fill', d => {
          let munColor = 0;
          if (byTrend === true) {
            if (byDeaths === true)
              munColor = typeof TotalReportDeathSlope.get(d.properties.COD_IBGE) === 'undefined' ? 0 : TotalReportDeathSlope.get(d.properties.COD_IBGE);
            else
              munColor = typeof TotalReportSlope.get(d.properties.COD_IBGE) === 'undefined' ? 0 : TotalReportSlope.get(d.properties.COD_IBGE);
            return self.colorScale(colorRangePlasma, [1, 2, 3, 4, 5, 6], munColor);
          } else {
            if (byDeaths === true) {
              munColor = typeof TotalDeathReport.get(d.properties.COD_IBGE) === 'undefined' ? 0 : TotalDeathReport.get(d.properties.COD_IBGE);
            } else {
              munColor = typeof TotalReport.get(d.properties.COD_IBGE) === 'undefined' ? 0 : TotalReport.get(d.properties.COD_IBGE);
            }
          }
          if (munColor === 0) {
            // return '#000000';
            return '#FFFFFF';
          }
          return color(munColor);
        })
        .attr('d', path)
        .attr('stroke', self.lineBorderColor)
        .on('mouseover', self.tipCounty.show)
        .on('mouseout', function() {
          d3.select(this).attr('stroke', self.lineBorderColor);
          d3.select(this).attr('stroke-width', 1);
          self.tipCounty.hide();
        });

      const widthTrans =
          Math.min(Math.abs(width - mapG.node().getBoundingClientRect().width) * 1.8, width * 0.30);
          // Math.min(Math.abs(width - d3.select('#county-g-map').node().getBoundingClientRect().width) * 1.8, width * 0.35);
      const heightTrans =
          Math.min(Math.abs(height - mapG.node().getBoundingClientRect().height) * 1.5, height * 0.35);
      mapG.attr('transform', 'translate( ' + widthTrans + ' , ' + heightTrans + ') scale(' + scaleRatio + ')');
    }

    self.tipCounty = d3Tip();
    self.tipCounty
      .attr('class', 'd3-tip')
      .html(function(d) {
        d3.select(this).attr('stroke', self.lineStrongerBorderColor);
        d3.select(this).attr('stroke-width', 3);
        // d3.select(this).attr('stroke', '#ED881A');
        const labelTot = byDensity === true ? 'Incidência casos' : 'Total casos';
        const labelTotDeath = byDensity === true ? 'Incidência óbitos' : 'Total óbitos';
        return (
          // '<div style="opacity:0.8;background-color:#8b0707;padding:7px;color:white">' +
          '<div style="opacity:0.8;background-color:#253494;padding:7px;color:white">' +
          '<text>Município: </text><text style="font-weight: 800">' +
          d.properties.NOME_MUNI +
          '</text><br/>' +
          '<text>' + labelTot + ': </text><text style="font-weight: 800">' +
          (typeof TotalReport.get(d.properties.COD_IBGE) === 'undefined'
            ? 0
            : self.formatValueSeperator(TotalReport.get(d.properties.COD_IBGE))) +
          '</text><br/>' +
          '<text>' + labelTotDeath + ': </text><text style="font-weight: 800">' +
          (typeof TotalDeathReport.get(d.properties.COD_IBGE) === 'undefined'
              ? 0
              : self.formatValueSeperator(TotalDeathReport.get(d.properties.COD_IBGE))) +
          '</text><br/>' +
          '<text>População: </text><text style="font-weight: 800">' +
          d3.format(',d')(self.population[d.properties.UF]['municipios'][d.properties.COD_IBGE]) +
          '</text><br/>' +
          '</div>'
        );
      });

    const zoom = d3
      .zoom()
      .scaleExtent([1, 8])
      .on('zoom', function() {
        mapG.selectAll('path').attr('transform', d3.event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    const scaleValue = Math.min((0.5 * height) / 150, (0.5 * width) / 150);
    svg.append('text')
      .attr('x', width / (2.2 * scaleValue))
      .attr('y', 20)
      .attr('transform', 'scale(' + scaleValue + ')')
      .attr('fill', self.colorText)
      .attr('font-family', 'sans-serif')
      .style('font-size', '23px')
      .style('font-weight', 'bold')
      .text(self.statesNames[stateParam].toUpperCase());

    g.selectAll('rect')
      .data(
        color.range().map(d => {
          d = color.invertExtent(d);
          if (d[0] == null) {
            d[0] = yLegend.domain()[0];
          }
          if (d[1] == null) {
            d[1] = yLegend.domain()[1];
          }
          return d;
        })
      )
      .enter()
      .append('rect')
      .attr('height', 26)
      .attr('x', -26)
      .attr('y', d => yLegend(d[1]) - 13)
      .attr('width', 23)
      // .attr('fill', (d) => color(d[0]));
      .attr('fill', d => {
        return color(d[1] - 1);
      });

    /*legend title*/
    g.append('text')
      .attr('font-family', 'sans-serif')
      .attr('x', -42)
      .attr('y', 20)
      .attr('fill', self.colorText)
      .attr('text-anchor', 'start')
      .attr('font-size', '22px')
      .attr('font-weight', 'bold')
      .text('Casos');

    let lastTick = 0;
    const currentScale = Math.min(scaleValue, (0.5 * height) / 200);
    g.attr(
      'transform',
      'translate(50, ' + (height - 160 * currentScale) + ') scale(' +  currentScale  + ')'
    )
      .attr('class', 'legend')
      .call(
        d3.axisRight(yLegend)
          .tickSize(0)
          // tslint:disable-next-line:only-arrow-functions
          .tickFormat(function(y, i) {
            if (byTrend === true) {
              if (i > 6) { return ''; }
              return self.slopeLabels[i];
            } else {
              if (i > 8) { return ''; }
              if (i === 0) { return '≤' + d3.format(',d')(y - 1) + ''; }
              if (i === 8) { return '≥' + d3.format(',d')(lastTick) + ''; }
              lastTick = y;
              return d3.format(',d')(y - 1) + '';
            }
          })
          .tickValues(color.domain())
      )
      .select('.domain')
      .remove();

    g.call(self.tipCounty);

    d3.select('#total-state').html(self.formatValueSeperator(self.totalState));
    d3.select('#total-state-deaths').html(self.formatValueSeperator(self.totalDeathState));
    if (byDensity === true) {
      d3.select('#name-total-state').html('Incidência ' + self.selectedState);
    } else {
      d3.select('#name-total-state').html('Confirmados ' + self.selectedState);
    }


    const countiesRankingElmnt = d3.select('#counties-ranking');
    countiesRankingElmnt.selectAll('*').remove();

    self.rankingCounties.sort((a, b) => (a.value < b.value ? 1 : -1));

    const classColor = byDeaths === false ? 'gt-number' : 'gt-dark-number';
    // tslint:disable-next-line:forin
    for (const item in self.rankingCounties) {
      countiesRankingElmnt
        .append('tr')
        .html(
            '<td class="' + classColor + ' gt-ranking-number"  style="padding-left: 6px; text-align: right">' +
            self.formatValueSeperator(self.rankingCounties[item].value) +
            '</td><td>' + self.rankingCounties[item].name + '</td>'
        );
    }
      self.loadCountiesHeatMapChart(stateParam, self.iniSelectedDay, self.endSelectedDay, byDeaths, byDensity, byNewCases );
  };


  loadStatesHeatMapChart = (iniDate, endDate, byDeaths = false, byDensity = false, byNewCases = false) => {
    const self = this;
    let container = d3.select('#svg-linechart-state').node() as any;
    if ( container === (undefined || null) || container.parentNode === (undefined || null)) { return; }
    container = container.parentNode.parentNode.getBoundingClientRect();
    const margin = { top: 20, right: 40, bottom: 25, left: 15 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    const parseDate = d3.timeParse('%Y-%m-%d');
    const statesList = [];
    const datesHeatMap = [];
    let addDate = true;
    const promises = [
      new Promise(resolve => {
        self.lineChartStates = [];
        let population = self.popScale;
        self.rankingStates.forEach(function(rankingElm, index) {
          // if (index > 9 && stateParam === '') { return; }
          const state = rankingElm.region;
          let posIni = self.listDatesStates.indexOf(iniDate);
          let posEnd = self.listDatesStates.indexOf(endDate);
          if (byDensity) {
            population = self.population[state].population;
          }

          while (self.listDatesStates[posIni] <= endDate) {
            let value = 0;
            let posTemp = (posIni + 7) < posEnd ? posIni + 7 : posEnd;
            if (byDeaths === true) {
              if (byNewCases === true) {
                if (self.byWeek === true) {
                  value = typeof self.data[self.listDatesStates[posIni - 1]] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni - 1]].total_death;
                  value = typeof self.data[self.listDatesStates[posTemp]] === 'undefined' ? 0 : self.data[self.listDatesStates[posTemp]].total_death - value;
                } else {  // By day
                  value = typeof self.data[self.listDatesStates[posIni]] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni]].new_death_cases;
                }
              } else {  // Accumulated (take the last day os that week)
                if (self.byWeek === true) {
                  if (posTemp === posEnd) posTemp += 1;
                  value = typeof self.data[self.listDatesStates[posTemp - 1]] === 'undefined' ? 0 : self.data[self.listDatesStates[posTemp - 1]].total_death;
                }else {
                  value = typeof self.data[self.listDatesStates[posIni]] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni]].total_death;
                }
              }

            } else {
              if (byNewCases === true) {
                if (self.byWeek === true) {
                  value = typeof self.data[self.listDatesStates[posIni - 1]] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni - 1]].total;
                  value = typeof self.data[self.listDatesStates[posTemp]] === 'undefined' ? 0 : self.data[self.listDatesStates[posTemp]].total - value;
                } else { // By day
                  value = typeof self.data[self.listDatesStates[posIni]] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni]].new_cases;
                }
              } else {  // Accumulated, take the last day of the week
                if (self.byWeek === true) {
                  if (posTemp === posEnd) posTemp += 1;
                  value = typeof self.data[self.listDatesStates[posTemp - 1]] === 'undefined' ? 0 : self.data[self.listDatesStates[posTemp - 1]].total;
                }else {
                  value = typeof self.data[self.listDatesStates[posIni]] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni]].total;
                }
              }
            }

            if (value > 0) {
              if (byDeaths === true) {
                if (byNewCases === true) {
                  if (self.byWeek === true) {
                    if (typeof self.data[self.listDatesStates[posIni - 1]] === 'undefined') value = 0;
                    else value = typeof self.data[self.listDatesStates[posIni - 1]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni - 1]]['estados'][state].total_death;
                    value = typeof self.data[self.listDatesStates[posTemp]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posTemp]]['estados'][state].total_death - value;
                  } else {  // By day
                    value = typeof self.data[self.listDatesStates[posIni]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni]]['estados'][state].new_death_cases;
                  }
                } else {
                  if (self.byWeek === true) {
                    if (posTemp === posEnd) posTemp += 1;
                    value = typeof self.data[self.listDatesStates[posTemp - 1]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posTemp - 1]]['estados'][state].total_death;
                  }else {
                    value = typeof self.data[self.listDatesStates[posIni]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni]]['estados'][state].total_death;
                  }
                }
              } else {
                if (byNewCases === true) {
                  if (self.byWeek === true) {
                    if (typeof self.data[self.listDatesStates[posIni - 1]] === 'undefined') value = 0;
                    else value = typeof self.data[self.listDatesStates[posIni - 1]]['estados'][state] ==='undefined' ? 0 : self.data[self.listDatesStates[posIni - 1]]['estados'][state].total;
                    value = typeof self.data[self.listDatesStates[posTemp]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posTemp]]['estados'][state].total - value;
                  } else {  // By day
                    value = typeof self.data[self.listDatesStates[posIni]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni]]['estados'][state].new_cases;
                  }
                } else {
                  if (self.byWeek === true) {
                    if (posTemp === posEnd) posTemp += 1;
                    value = typeof self.data[self.listDatesStates[posTemp - 1]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posTemp - 1]]['estados'][state].total;
                  }else {
                    value = typeof self.data[self.listDatesStates[posIni]]['estados'][state] === 'undefined' ? 0 : self.data[self.listDatesStates[posIni]]['estados'][state].total;
                  }
                }

              }
            }
            if (value > 0 || byNewCases === true) {
              value = value * (self.popScale / population);
              self.lineChartStates.push({ region: state, date: parseDate(self.listDatesStates[posIni]), value: value });
            }
            if (addDate === true) datesHeatMap.push(self.listDatesStates[posIni]);
            if (self.byWeek === true){
              posIni = posIni + 7;
              if (posIni > posEnd) break;
            } else {
              posIni = posIni + 1;
            }
          }
          statesList.push(state);
          addDate = false;
        });
        resolve(true);
      })
    ];

    Promise.all(promises).then(ready);

    d3.select('#svg-linechart-state').selectAll('*').remove();

    const svg = d3.select('#svg-linechart-state')
        .attr('x', 0)
        .attr('y', margin.top * 1.5)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('viewBox', '0 0 ' + container.width + ' ' + container.height);

    const g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top * 3 + ')');

    function ready([dataPoints]) {
      let legendRange = [];
      for (let i = 0; i < 9; i++) legendRange.push((self.globalStatesStep/5)*i);
      if (byDeaths === true) {
        legendRange = [];
        for (let i = 0; i < 9; i++) legendRange.push((self.globalStatesStep/4)*i);
        if (byDensity === true ) {
          legendRange = [];
          for (let i = 0; i < 9; i++) legendRange.push((self.globalStatesStep)*i);
          if (byNewCases === true) {
            legendRange = [];
            for (let i = 0; i < 9; i++) legendRange.push((self.globalStatesStep/10)*i);
          }
        } else {
          if (byNewCases === true) {
            legendRange = [];
            for (let i = 0; i < 9; i++) legendRange.push((self.globalStatesStep/50)*i);
          }
        }
      } else {
        if (byDensity === true) {
          legendRange = [];
          for (let i = 0; i < 9; i++) legendRange.push((self.globalStatesStep)*i);
          if (byNewCases === true) {
            legendRange = [];
            for (let i = 0; i < 9; i++) legendRange.push((self.globalStatesStep/10)*i);
          }
        } else {
          if (byNewCases === true) {
            legendRange = [];
            for (let i = 0; i < 9; i++) legendRange.push((self.globalStatesStep/50)*i);
          }
        }
      }
      const colorRange = self.getPlasmaList(9);
      const qtyDays = datesHeatMap.length;
      const gridSizeX = width / qtyDays;
      const gridSizeY = height / 12;
      const times = datesHeatMap;
      const legendElementWidth = width / 14;
      console.log(datesHeatMap[0], datesHeatMap[datesHeatMap.length -1]);
      const x = d3.axisBottom().tickFormat(d3.timeFormat('%d/%m')).scale(d3.scaleTime()
              .domain([d3.timeParse('%Y-%m-%d')(datesHeatMap[0]), d3.timeParse('%Y-%m-%d')(datesHeatMap[datesHeatMap.length - 1])])
              .range([0, gridSizeX * (qtyDays - 0.9)]));
      let titleLabel = 'Casos confirmados ';
      let titleByWeekLabel = ' (diário)';
      if (byDensity === true) {
        titleLabel = 'Incidência ';
      }

      if (self.byWeek === true) {
        titleByWeekLabel = ' (semanal)';
      }
      const scaleValue = Math.min((0.4 * height) / 150, (0.4 * width) / 150);
      svg.append('text')
          .attr('transform', 'scale(' + scaleValue + ')')
          .attr('x', (width / 3.5 < 120) ? 40 : (width / 3.5))
          .attr('y', margin.top)
          .attr('fill', self.colorText)
          .attr('font-family', 'sans-serif')
          .style('font-size', 'min(calc(2vh), calc(1.5vw))')
          // .style('font-size', 15)
          .style('font-weight', 'bold')
          .text(titleLabel + ' por estado' + titleByWeekLabel);

      g.append('g')
          .attr('class', 'x-axis')
          // .attr('transform', 'translate( 0,' + 0 + ') scale(' + scaleValue + ')')
          .attr('transform', 'translate( 0,' + 0 + ')')
          .call(x)
          .selectAll('text')
          .attr('y', 0)
          .attr('x', 9)
          .attr('dy', '.35em')
          .attr('transform', 'rotate(-45)')
          .style('text-anchor', 'start');

      d3.selectAll('g.x-axis path.domain').remove();
      d3.selectAll('g.x-axis line').remove();

      const scrollG = svg
          .append('g')
          .attr('id', 'scroll-y-div')
          .attr('width', width)
          .attr('height', 9.9 * gridSizeY)
          .attr('transform', 'translate(0,' + margin.top * 3 + ')');
      scrollG.append('rect')
          .attr('width', width + margin.left + margin.right)
          .attr('height', 9 * gridSizeY)
          .attr('x', 0).attr('y', 0)
          .attr('fill-opacity', 0);

      const scrollGDiv = svg
          .append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', 10 * gridSizeY)
          .attr('x', 0)
          .attr('y', margin.top * 3)
          .attr('transform', 'translate(0, 0)');

      const dayLabels = scrollGDiv.selectAll('.dayLabel')
          .data(statesList)
          .enter().append('text')
          .text(function (d) { return d; })
          .attr('x', 18)
          .attr('y', function (d, i) { return i * gridSizeY; })
          .style('text-anchor', 'end')
          .style('fill', self.colorText)
          .attr('transform', 'translate(0,' + gridSizeY / 1.5 + ')');

      const heatMapG = scrollGDiv
          .append('g')
          .attr('transform', 'translate(20, 0)');
      const heatMap = heatMapG
          .selectAll('.hour')
          .data(self.lineChartStates)
          .enter().append('rect')
          .attr('x', function (d) {
            if (d3.timeFormat('%Y-%m-%d')(d.date) !== -1) { return times.indexOf(d3.timeFormat('%Y-%m-%d')(d.date)) * gridSizeX; }
          })
          .attr('y', function (d) {
            if (d3.timeFormat('%Y-%m-%d')(d.date) !== -1) { return (statesList.indexOf(d.region)) * gridSizeY; }
          })
          .attr('rx', 1)
          .attr('ry', 1)
          .attr('class', 'hour bordered')
          .attr('width', gridSizeX)
          .attr('height', gridSizeY)
          .style('fill', '#ffffff')
          .on('mouseover', self.tipLineState.show)
          .on('mouseout', self.tipLineState.hide);

      heatMap.transition().duration(1000).style('fill', function (d) {
            return self.colorScale(colorRange, legendRange, d.value);
          });

/*BEGIN SCROLLBAR*/
      let scrollDistance = 0;
      const root = scrollGDiv.attr('clip-path', 'url(#scrollbox-clip-path)');
      const clipRect = scrollGDiv.append('clipPath').attr('id', 'scrollbox-clip-path').append('rect');
      clipRect.attr('x', 0)
          .attr('y', 0)
          .attr('width', width + margin.left + margin.right)
          .attr('height', 10 * gridSizeY);

      root.insert('rect', 'g')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', width + margin.left + margin.right)
          .attr('height', 10 * gridSizeY)
          .attr('opacity', 0);

      const scrollBar = scrollG.append('rect')
          .attr('width', 2)
          .attr('rx', 1)
          .attr('ry', 1)
          .attr('transform', 'translate(' + scrollG.node().getBoundingClientRect().width + ',0)');

      const absoluteContentHeight = heatMapG.node().getBoundingClientRect().height;
      const scrollbarHeight = absoluteContentHeight === 0 ? 0 :
          scrollG.node().getBoundingClientRect().height * scrollG.node().getBoundingClientRect().height / absoluteContentHeight;
      scrollBar.attr('height', scrollbarHeight);

      const maxScroll = Math.max(absoluteContentHeight - scrollG.node().getBoundingClientRect().height, 0);

      function updateScrollPosition(diff) {
        scrollDistance += diff;
        scrollDistance = Math.max(0, scrollDistance);
        scrollDistance = Math.min(maxScroll, scrollDistance);

        heatMapG.attr('transform', 'translate(20, ' + (-scrollDistance) + ')');
        dayLabels.attr('transform', 'translate(0, ' + ( gridSizeY / 1.5 - scrollDistance) + ')');
        const scrollBarPosition = scrollDistance / maxScroll * (scrollG.node().getBoundingClientRect().height - scrollbarHeight);
        scrollBar.attr('y', scrollBarPosition);
      }

      // Set up scroll events
      root.on('wheel', (e) => {
        updateScrollPosition(d3.event.deltaY)
      });

      // Set up scrollbar drag events
      const dragBehaviour = d3.drag()
          .on('drag', () => {
            updateScrollPosition(d3.event.dy * maxScroll / (svg.height - scrollbarHeight))
          });
      scrollBar.call(dragBehaviour);

/*END*/
      const legend = g.append('g').attr('transform', 'translate(10, ' + ( 10 * gridSizeY + 2) + ')');

      legend.selectAll('rect')
          .data(legendRange)
          .enter()
          .append('rect')
          .attr('fill', function(d) { return self.colorScale(colorRange, legendRange, d); })
          .attr('x', function(d, i) { return legendElementWidth * i; })
          .attr('width', legendElementWidth)
          .attr('height', gridSizeY / 2);

      legend.selectAll('text')
          .data(legendRange)
          .join('text')
          .attr('fill', self.colorText)
          .attr('x', function(d, i) { return legendElementWidth * i; })
          .attr('y', gridSizeY + 2)
          .text(function(d, i) {
            if (i === colorRange.length - 1) { return '≥' + self.yFormat(d); }
            return '' + self.yFormat(d);
          });
      }

    self.tipLineState = d3Tip();
    self.tipLineState
        .attr('class', 'd3-tip')
        .offset([20, -80])
        .html(function(d) {
          const date = new Date(d.date);
          if (self.byWeek === true) date.setDate(d.date.getDate() + 6);
          return (
              // '<div style="opacity:0.8;background-color:#8b0707;padding:7px;color:white">' +
              '<div style="opacity:0.8;background-color:#253494;padding:7px;color:white">' +
              '<text style="font-weight: 800">' +
              self.statesNames[d.region] +
              '</text></br><text>' +
              d3.timeFormat('%d/%m')(date) +
              ':</text> <text style="font-weight: 800">' +
              self.formatValueSeperator(d.value) +
              '</text>' +
              '</div>'
          );
        });
    svg.call(self.tipLineState);
    };

  loadCountiesHeatMapChart = (stateParam, iniDate, endDate, byDeaths = false, byDensity = false, byNewCases = false) => {
    const self = this;
    let container = d3.select('#svg-linechart-county').node() as any;
    if ( container === (undefined || null) || container.parentNode === (undefined || null) ) {
      return;
    }
    container = container.parentNode.parentNode.getBoundingClientRect();
    const margin = { top: 20, right: 40, bottom: 25, left: 45 };
    const width = container.width - margin.left - margin.right;
    const height = container.height - margin.top - margin.bottom;

    const parseDate = d3.timeParse('%Y-%m-%d');
    const datesHeatMap = [];
    let addDate = true;

    // Define scales
    const xScale = d3.scaleTime().range([0, width]);

    d3.select('#svg-linechart-county').selectAll('*').remove();

    const countiesList = [];
    const ibgeList = [];

    let posIniTemp = self.listDatesCounties.indexOf(iniDate);
    while (self.listDatesCounties[posIniTemp] <= endDate) {
      if (typeof self.data[self.listDatesCounties[posIniTemp]] !== 'undefined' &&
          typeof self.data[self.listDatesCounties[posIniTemp]]['estados'][stateParam] !== 'undefined') {
        // tslint:disable-next-line:forin
        for (const county in self.data[self.listDatesCounties[posIniTemp]]['estados'][stateParam]['municipios']) {
          if (-1 === ibgeList.indexOf(county)) { ibgeList.push(county); }
        }
      }
      posIniTemp = posIniTemp + 1;
    }

    const promises = [
      new Promise(resolve => {
        self.lineChartCounties = [];

        let population = self.popScale;

        self.rankingCounties.forEach(function(rankingElm, index) {
          const county = rankingElm.ibge;
          if (byDensity === true) {
              population = typeof self.population[stateParam]['municipios'][county] === 'undefined' ? 1000000 :
                  self.population[stateParam]['municipios'][county];
          }
          let posIni = self.listDatesCounties.indexOf(iniDate);
          let posEnd = self.listDatesStates.indexOf(endDate);
          while (self.listDatesCounties[posIni] <= endDate) {
            let posTemp = (posIni + 7) < posEnd ? posIni + 7 : posEnd;
            let value = 0;
            if (byDeaths === true) {
              if (byNewCases === true) {
                if (self.byWeek === true) {
                  value = typeof self.data[self.listDatesCounties[posIni - 1]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni - 1]].total_death;
                  value = typeof self.data[self.listDatesCounties[posTemp]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp]].total_death - value;
                } else {  // By day
                  value = typeof self.data[self.listDatesCounties[posIni]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]].new_death_cases;
                }
              } else {  // Acumulated by day, if byweek just the last day of that week
                if (self.byWeek === true) {
                  if (posTemp === posEnd) posTemp += 1;
                  value = typeof self.data[self.listDatesCounties[posTemp - 1]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp - 1]].total_death;
                }else {
                  value = typeof self.data[self.listDatesCounties[posIni]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]].total_death;
                }
              }
            } else {
              if (byNewCases === true) {
                if (self.byWeek === true) {
                  value = typeof self.data[self.listDatesCounties[posIni - 1]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni - 1]].total;
                  value = typeof self.data[self.listDatesCounties[posTemp]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp]].total - value;
                } else {  // By day
                  value = typeof self.data[self.listDatesCounties[posIni]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]].new_cases;
                }
              } else {  // Acumulated by day, if byweek just the last day of that week
                if (self.byWeek === true) {
                  if (posTemp === posEnd) posTemp += 1;
                  value = typeof self.data[self.listDatesCounties[posTemp - 1]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp - 1]].total;
                }else {
                  value = typeof self.data[self.listDatesCounties[posIni]] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]].total;
                }
              }
            }
            if (value > 0) {
              if (byDeaths === true) {
                if (byNewCases === true) {
                  if (self.byWeek === true) {
                    if (typeof self.data[self.listDatesCounties[posIni - 1]] === 'undefined') value = 0;
                    else value = typeof self.data[self.listDatesCounties[posIni - 1]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni - 1]]['estados'][stateParam].total_death;
                    value = typeof self.data[self.listDatesCounties[posTemp]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp]]['estados'][stateParam].total_death - value;
                  } else {  // By day
                    value = typeof self.data[self.listDatesCounties[posIni]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]]['estados'][stateParam].new_death_cases;
                  }
                } else {  // Acumulated by day, if byweek just the last day of that week
                  if (self.byWeek === true) {
                    if (posTemp === posEnd) posTemp += 1;
                    value = typeof self.data[self.listDatesCounties[posTemp - 1]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp - 1]]['estados'][stateParam].total_death;
                  }else {
                    value = typeof self.data[self.listDatesCounties[posIni]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]]['estados'][stateParam].total_death;
                  }
                }
              } else {
                if (byNewCases === true) {
                  if (self.byWeek === true) {
                    if (typeof self.data[self.listDatesCounties[posIni - 1]] === 'undefined') value = 0;
                    else value = typeof self.data[self.listDatesCounties[posIni - 1]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni - 1]]['estados'][stateParam].total;
                    value = typeof self.data[self.listDatesCounties[posTemp]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp]]['estados'][stateParam].total - value;
                  } else {  // By day
                    value = typeof self.data[self.listDatesCounties[posIni]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]]['estados'][stateParam].new_cases;
                  }
                } else {  // Acumulated by day, if byweek just the last day of that week
                  if (self.byWeek === true) {
                    if (posTemp === posEnd) posTemp += 1;
                    value = typeof self.data[self.listDatesCounties[posTemp - 1]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp - 1]]['estados'][stateParam].total;
                  }else {
                    value = typeof self.data[self.listDatesCounties[posIni]]['estados'][stateParam] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]]['estados'][stateParam].total;
                  }
                }
              }
            }
            if (value > 0) {
              if (byDeaths === true) {
                if (byNewCases === true) {
                  if (self.byWeek === true) {
                    value = typeof self.data[self.listDatesCounties[posIni - 1]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni - 1]]['estados'][stateParam]['municipios'][county].total_death;
                    value = typeof self.data[self.listDatesCounties[posTemp]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp]]['estados'][stateParam]['municipios'][county].total_death - value;
                  } else {  // By day
                    value = typeof self.data[self.listDatesCounties[posIni]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]]['estados'][stateParam]['municipios'][county].new_death_cases;
                  }
                } else {  // Acumulated by day, if byweek just the last day of that week
                  if (self.byWeek === true) {
                    if (posTemp === posEnd) posTemp += 1;
                    value = typeof self.data[self.listDatesCounties[posTemp - 1]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp - 1]]['estados'][stateParam]['municipios'][county].total_death;
                  }else {
                    value = typeof self.data[self.listDatesCounties[posIni]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]]['estados'][stateParam]['municipios'][county].total_death;
                  }
                }
              } else {
                if (byNewCases === true) {
                  if (self.byWeek === true) {
                    value = typeof self.data[self.listDatesCounties[posIni - 1]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni - 1]]['estados'][stateParam]['municipios'][county].total;
                    value = typeof self.data[self.listDatesCounties[posTemp]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp]]['estados'][stateParam]['municipios'][county].total - value;
                  } else {  // By day
                    value = typeof self.data[self.listDatesCounties[posIni]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]]['estados'][stateParam]['municipios'][county].new_cases;
                  }
                } else {  // Acumulated by day, if byweek just the last day of that week
                  if (self.byWeek === true) {
                    if (posTemp === posEnd) posTemp += 1;
                    value = typeof self.data[self.listDatesCounties[posTemp - 1]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posTemp - 1]]['estados'][stateParam]['municipios'][county].total;
                  }else {
                    value = typeof self.data[self.listDatesCounties[posIni]]['estados'][stateParam]['municipios'][county] === 'undefined' ? 0 : self.data[self.listDatesCounties[posIni]]['estados'][stateParam]['municipios'][county].total;
                  }
                }
              }
            }
            if (value > 0 || byNewCases === true) {
              value = value * (self.popScale / population);
              self.lineChartCounties.push({ date: parseDate(self.listDatesCounties[posIni]),
                value: value,
                region: county
              });
            }
            if (addDate === true) datesHeatMap.push(self.listDatesStates[posIni]);
            if (self.byWeek === true){
              posIni = posIni + 7;
              if (posIni > posEnd) break;
            } else {
              posIni = posIni + 1;
            }
          }
          countiesList.push(county);
          addDate = false;
        });
        resolve(true);
      })
    ];
    Promise.all(promises).then(ready);
    d3.select('#svg-linechart-county').selectAll('*').remove();

    const svg = d3.select('#svg-linechart-county')
        .attr('x', 0)
        .attr('y', margin.top * 1.5)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .attr('viewBox', '0 0 ' + container.width + ' ' + container.height);

    const g = svg.append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top * 3 + ')');

    function ready([dataPoints]) {
      let legendRange = [];
      for (let i = 0; i < 9; i++) legendRange.push((self.globalCountiesStep/5)*i);

      if (byDeaths === true) {
        legendRange = [];
        for (let i = 0; i < 9; i++) legendRange.push((self.globalCountiesStep/4)*i);
        if (byDensity === true ) {
          legendRange = [];
          for (let i = 0; i < 9; i++) legendRange.push((self.globalCountiesStep)*i);
          if (byNewCases === true) {
            legendRange = [];
            for (let i = 0; i < 9; i++) legendRange.push((self.globalCountiesStep/10)*i);
          }
        } else {
          if (byNewCases === true) {
            legendRange = [];
            for (let i = 0; i < 9; i++) legendRange.push((self.globalCountiesStep/50)*i);
          }
        }
      } else {
        if (byDensity === true) {
          legendRange = [];
          for (let i = 0; i < 9; i++) legendRange.push((self.globalCountiesStep)*i);
          if (byNewCases === true) {
            legendRange = [];
            for (let i = 0; i < 9; i++) legendRange.push((self.globalCountiesStep/10)*i);
          }
        } else {
          if (byNewCases === true) {
            legendRange = [];
            for (let i = 0; i < 9; i++) legendRange.push((self.globalCountiesStep/50)*i);
          }
        }
      }

      const colorRange = self.getPlasmaList(9);
      const qtyDays = datesHeatMap.length;
      const gridSizeX = width / qtyDays;
      const gridSizeY = height / 12;
      const times = datesHeatMap;
      const legendElementWidth = width / 14;
      const x = d3.axisBottom().tickFormat(d3.timeFormat('%d/%m')).scale(d3.scaleTime()
          // .domain([d3.timeParse('%Y-%m-%d')(self.iniSelectedDay), d3.timeParse('%Y-%m-%d')(self.endSelectedDay)])
          .domain([d3.timeParse('%Y-%m-%d')(datesHeatMap[0]), d3.timeParse('%Y-%m-%d')(datesHeatMap[datesHeatMap.length - 1])])
          .range([0, gridSizeX * (qtyDays - 0.9)]));
      let titleLabel = 'Casos confirmados ';
      let titleByWeekLabel = ' (diário)';
      if (byDensity === true) {
        titleLabel = 'Incidência ';
      }

      if (self.byWeek === true) {
        titleByWeekLabel = ' (semanal)';
      }
      const scaleValue = Math.min((0.4 * height) / 150, (0.4 * width) / 150);
      svg.append('text')
          .attr('transform', 'scale(' + scaleValue + ')')
          .attr('x', (width / 4 < 120) ? 20 : (width / 4) )
          .attr('y', margin.top)
          .attr('fill', self.colorText)
          .attr('font-family', 'sans-serif')
          .style('font-size', 'min(calc(2vh), calc(1.5vw))')
          // .style('font-size', 15)
          .style('font-weight', 'bold')
          .text(titleLabel + 'por município no ' + self.selectedState + titleByWeekLabel);

      g.append('g')
          .attr('class', 'x-axis')
          // .attr('transform', 'translate(4,' + 0 + ') scale(' + scaleValue + ')')
          .attr('transform', 'translate(4,' + 0 + ')')
          .call(x)
          .selectAll('text')
          .attr('y', 0)
          .attr('x', 9)
          .attr('dy', '.35em')
          .attr('transform', 'rotate(-45)')
          .style('text-anchor', 'start');

      d3.selectAll('g.x-axis path.domain').remove();
      d3.selectAll('g.x-axis line').remove();


      const scrollG = svg
          .append('g')
          .attr('id', 'scroll-y-div')
          .attr('width', width)
          .attr('height', 9.9 * gridSizeY)
          .attr('transform', 'translate(0,' + margin.top * 3 + ')');
      scrollG.append('rect')
          .attr('width', width + margin.left + margin.right)
          .attr('height', 9 * gridSizeY)
          .attr('x', 0).attr('y', 0)
          .attr('fill-opacity', 0);

      const scrollGDiv = svg
          .append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', 10 * gridSizeY)
          .attr('x', 0)
          .attr('y', margin.top * 3)
          .attr('transform', 'translate(0, 0)');

      const dayLabels = scrollGDiv.selectAll('.dayLabel')
          .data(countiesList)
          .enter().append('text')
          .text(function (d) { return self.countiesNames[d].slice(0, 8); })
          .on('mouseover', self.tipLineCountyName.show)
          .on('mouseout', self.tipLineCountyName.hide)
          .attr('x', 52)
          .attr('y', function (d, i) { return i * gridSizeY; })
          .style('text-anchor', 'end')
          .style('fill', self.colorText)
          .attr('transform', 'translate(0,' + gridSizeY / 1.5 + ')');

      const heatMapG = scrollGDiv
          .append('g')
          .attr('transform', 'translate(50, 0)');
      const heatMap = heatMapG
          .selectAll('.hour')
          .data(self.lineChartCounties)
          .enter().append('rect')
          .attr('x', function (d) {
            if (d3.timeFormat('%Y-%m-%d')(d.date) !== -1) { return times.indexOf(d3.timeFormat('%Y-%m-%d')(d.date)) * gridSizeX; }
          })
          .attr('y', function (d) {
            if (d3.timeFormat('%Y-%m-%d')(d.date) !== -1) { return (countiesList.indexOf(d.region)) * gridSizeY; }
          })
          .attr('rx', 1)
          .attr('ry', 1)
          .attr('class', 'hour bordered')
          .attr('width', gridSizeX)
          .attr('height', gridSizeY)
          .style('fill', '#ffffff')
          .on('mouseover', self.tipLineCounty.show)
          .on('mouseout', self.tipLineCounty.hide);

      heatMap.transition().duration(1000).style('fill', function (d) {
        return self.colorScale(colorRange, legendRange, d.value);
      });

      /*BEGIN SCROLLBAR*/
      let scrollDistance = 0;
      const root = scrollGDiv.attr('clip-path', 'url(#scrollbox-clip-path)');
      const clipRect = scrollGDiv.append('clipPath').attr('id', 'scrollbox-clip-path').append('rect');
      clipRect.attr('x', 0)
          .attr('y', 0)
          .attr('width', width + margin.left + margin.right)
          .attr('height', 10 * gridSizeY);

      root.insert('rect', 'g')
          .attr('x', 50)
          .attr('y', 0)
          .attr('width', width + margin.left + margin.right)
          .attr('height', 10 * gridSizeY)
          .attr('opacity', 0);

      const scrollBar = scrollG.append('rect')
          .attr('width', 2)
          .attr('rx', 1)
          .attr('ry', 1)
          .attr('transform', 'translate(' + scrollG.node().getBoundingClientRect().width + ',0)');

      const absoluteContentHeight = heatMapG.node().getBoundingClientRect().height;
      const scrollbarHeight = absoluteContentHeight === 0 ? 0 :
          scrollG.node().getBoundingClientRect().height * scrollG.node().getBoundingClientRect().height / absoluteContentHeight;
      scrollBar.attr('height', scrollbarHeight);

      const maxScroll = Math.max(absoluteContentHeight - scrollG.node().getBoundingClientRect().height, 0);

      function updateScrollPosition(diff) {
        scrollDistance += diff;
        scrollDistance = Math.max(0, scrollDistance);
        scrollDistance = Math.min(maxScroll, scrollDistance);

        heatMapG.attr('transform', 'translate(50, ' + (-scrollDistance) + ')');
        dayLabels.attr('transform', 'translate(0, ' + ( gridSizeY / 1.5 - scrollDistance) + ')');
        const scrollBarPosition = scrollDistance / maxScroll * (scrollG.node().getBoundingClientRect().height - scrollbarHeight);
        scrollBar.attr('y', scrollBarPosition);
      }

      // Set up scroll events
      root.on('wheel', (e) => {
        updateScrollPosition(d3.event.deltaY)
      });

      // Set up scrollbar drag events
      const dragBehaviour = d3.drag()
          .on('drag', () => {
            updateScrollPosition(d3.event.dy * maxScroll / (svg.height - scrollbarHeight))
          });
      scrollBar.call(dragBehaviour);

      /*END*/

      const legend = g.append('g').attr('transform', 'translate(10, ' + ( 10 * gridSizeY + 2) + ')');

      legend.selectAll('rect')
          .data(legendRange)
          .enter()
          .append('rect')
          .attr('fill', function(d) { return self.colorScale(colorRange, legendRange, d); })
          .attr('x', function(d, i) { return legendElementWidth * i; })
          .attr('width', legendElementWidth)
          .attr('height', gridSizeY / 2);

      legend.selectAll('text')
          .data(legendRange)
          .join('text')
          .attr('fill', self.colorText)
          .attr('x', function(d, i) { return legendElementWidth * i; })
          .attr('y', gridSizeY + 2)
          .text(function(d, i) {
            if (i === colorRange.length - 1) { return '≥' + self.yFormat(d); }
            return '' + self.yFormat(d);
          });
    }
    self.tipLineCounty = d3Tip();
    self.tipLineCounty
        .attr('class', 'd3-tip')
        .offset([20, -80])
        .html(function(d) {
          const date = new Date(d.date);
          if (self.byWeek === true) date.setDate(d.date.getDate() + 6);
          return (
              // '<div style="opacity:0.8;background-color:#8b0707;padding:7px;color:white">' +
              '<div style="opacity:0.8;background-color:#253494;padding:7px;color:white">' +
              '<text style="font-weight: 800">' +
              self.countiesNames[d.region] +
              '</text></br><text>' +
              d3.timeFormat('%d/%m')(date) +
              ':</text> <text style="font-weight: 800">' +
              self.formatValueSeperator(d.value) +
              '</text>' +
              '</div>'
          );
        });
    self.tipLineCountyName = d3Tip();
    self.tipLineCountyName
        .attr('class', 'd3-tip')
        .offset([20, -80])
        .html(function(d) {
          return (
              // '<div style="opacity:0.8;background-color:#8b0707;padding:7px;color:white">' +
              '<div style="opacity:0.8;background-color:#253494;padding:7px;color:white">' +
              '<text style="font-weight: 800">' +
              self.countiesNames[d] +
              '</text>' +
              '</div>'
          );
        });
    svg.call(self.tipLineCounty);
    svg.call(self.tipLineCountyName);
  };

  ngAfterViewInit() {
    window.addEventListener('resize', this.loadResizeWindow);
  }

  ngOnDestroy() {
  }
}
