var compositeChart = new dc.CompositeChart("#chart1");
var rowChart = new dc.RowChart("#chart2");
var chart = new dc.BarChart("#chart3");
var lineChart = new dc.LineChart("#chart5");

//var view = md`${pieCharts('Indicadores gerais de evasão')}`
var pieChartGenero = new dc.PieChart("#pie-chart-genero");
var pieChartGrau = new dc.PieChart("#pie-chart-grau");
var pieChartBolsa = new dc.PieChart("#pie-chart-bolsa");
var pieChartModalidade = new dc.PieChart("#pie-chart-modalidade");

let promises = [
    d3.csv('https://raw.githubusercontent.com/Fausto14/datavis/main/CENSO_2015_2019_UFC.csv'),
    d3.json("https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json")
]

Promise.all(promises).then(ready);

function ready([data, municipios]) {


    // Run the data through crossfilter and load our 'facts'
    let facts = crossfilter(data);


    // FUNÇÕES REDUCE
    function reduceAddEvadidos(p, v) {
        if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido')
            ++p;
        return p;
    }

    function reduceRemoveEvadidos(p, v) {
        if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido')
            --p;
        return p;
    }

    function reduceInitialEvadidos() {
        return 0;
    }


    function reduceAddTaxa(p, v) {
        if (v.SITUACAO === 'Desistente')
            ++p.desistentes;
        if (v.SITUACAO === 'Transferido')
            ++p.tranferidos;
        if (v.SITUACAO === 'Falecido')
            ++p.falecidos;

        if (v.ANO_CENSO === v.ANO_INGRESSO)
            ++p.ingressantes;

        p.taxa = (p.desistentes + p.tranferidos) / (p.ingressantes - p.falecidos) * 100;

        if ((p.desistentes + p.tranferidos) === 0) p.taxa = 0;
        else
            if (((p.ingressantes - p.falecidos)) <= 0) p.taxa = 100;

        return p;
    }

    function reduceRemoveTaxa(p, v) {
        if (v.SITUACAO === 'Desistente')
            --p.desistentes;
        if (v.SITUACAO === 'Transferido')
            --p.tranferidos;
        if (v.SITUACAO === 'Falecido')
            --p.falecidos;

        if (v.ANO_CENSO === v.ANO_INGRESSO)
            --p.ingressantes;

        p.taxa = (p.desistentes + p.tranferidos) / (p.ingressantes - p.falecidos) * 100;

        if ((p.desistentes + p.tranferidos) === 0) p.taxa = 0;
        else
            if (((p.ingressantes - p.falecidos)) <= 0) p.taxa = 100;

        return p;
    }

    function reduceInitialTaxa() {
        return {
            desistentes: 0,
            tranferidos: 0,
            ingressantes: 0,
            falecidos: 0,
            taxa: 0
        };
    }

    function sel_stack(i) {
        return d => d.value[i];
    }

    function reduceAddEvadidos2019(p, v) {
        if ((v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido'))
            ++p;
        return p;
    }

    function reduceRemoveEvadidos2019(p, v) {
        if ((v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido'))
            --p;
        return p;
    }

    function reduceInitialEvadidos2019() {
        return 0;
    }

    function getTops(source_group, k) {
        return {
            all: function () {
                return source_group.top(k);
            }
        };
    }



    // DIMENSÕES
    let anoDim = facts.dimension(function (d) {
        return d.ANO_CENSO;
    });

    let tipoEscolaDim = facts.dimension(function (d) {
        return d.TP_ESCOLA_CONCLUSAO_ENS_MEDIO;
    });

    let tempoEvasaoDim = facts.dimension(function (d) {
        return d.ANO_CENSO - d.ANO_INGRESSO;
    });

    let tempCrossfilter = crossfilter(tempoEvasaoDim.top(Infinity));

    let tempDimension = tempCrossfilter.dimension(function (d) {
        return d.ANO_CENSO - d.ANO_INGRESSO;
    });

    let sitDim = facts.dimension(function (d) {
        return d.NO_CURSO;
    });

    let generoDim = facts.dimension(d => d.SEXO);
    let grauDim = facts.dimension(d => d.GRAU_ACADEMICO)
    let modalidadeDim = facts.dimension(d => d.MODALIDADE_ENSINO)
    let bolsaDim = facts.dimension(d => d.BOLSA_ESTAGIO === '1' || d.BOLSA_EXTENSAO === '1' || d.BOLSA_MONITORIA === '1' || d.BOLSA_PESQUISA === '1')
    let racaDim = facts.dimension(d => d.COR_RACA)
    let poloDim = facts.dimension(d => d.MUNICIPIO_LOCAL_OFERTA)

    // GRUPOS
    let evadidosPorAnoGrupo = anoDim.group().reduce(reduceAddEvadidos, reduceRemoveEvadidos, reduceInitialEvadidos);
    let taxaEvasaoPorAnoGrupo = anoDim.group().reduce(reduceAddTaxa, reduceRemoveTaxa, reduceInitialTaxa);
    let evasaoOrigemAnoGrupo = anoDim.group().reduce((p, v) => {
        if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido') {
            ++p.total;
            p.cPrivada += (v.TP_ESCOLA_CONCLUSAO_ENS_MEDIO === 'Privada' ? 1 : 0);
            p.Privada = p.total ? p.cPrivada / p.total : 0;

            p.cPublica += (v.TP_ESCOLA_CONCLUSAO_ENS_MEDIO === 'Publica' ? 1 : 0);
            p.Publica = p.total ? p.cPublica / p.total : 0;

            p['cSem resposta'] += (v.TP_ESCOLA_CONCLUSAO_ENS_MEDIO === 'Sem resposta' ? 1 : 0);
            p['Sem resposta'] = p.total ? p['cSem resposta'] / p.total : 0;
        }
        return p;
    }, (p, v) => {
        if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido') {
            --p.total;
            p.cPrivada -= (v.TP_ESCOLA_CONCLUSAO_ENS_MEDIO === 'Privada' ? 1 : 0);
            p.Privada = p.total ? p.cPrivada / p.total : 0;

            p.cPublica -= (v.TP_ESCOLA_CONCLUSAO_ENS_MEDIO === 'Publica' ? 1 : 0);
            p.Publica = p.total ? p.cPublica / p.total : 0;

            p['cSem resposta'] -= (v.TP_ESCOLA_CONCLUSAO_ENS_MEDIO === 'Sem resposta' ? 1 : 0);
            p['Sem resposta'] = p.total ? p['cSem resposta'] / p.total : 0;
        }
        return p;
    }, () => {
        return {
            total: 0,
            cPrivada: 0,
            Privada: 0,
            cPublica: 0,
            Publica: 0,
            'cSem resposta': 0,
            'Sem resposta': 0,
        }
    });
    let evadidosTempoDeCursoGroup = tempoEvasaoDim.group().reduce((p, v) => {
        if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido')
            ++p;
        return p;
    }, (p, v) => {
        if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido')
            --p;
        return p;
    }, () => {
        return 0;
    });

    let evasaoPorCursoGrupo2019 = sitDim.group().reduce(reduceAddEvadidos2019, reduceRemoveEvadidos2019, reduceInitialEvadidos2019);
    let evasaoPorCursoGrupo2019Top10 = getTops(evasaoPorCursoGrupo2019, 10);

    let evasaoGeneroGrupo = anoDim.group().reduce((p, v) => {
        let ini = 16;
        let step = 3;
        let end = 49;
        let until = 0;
        for (var i = 0; i < 12; i++) {
            if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido') {
                until = ini + step - 1;
                if (+v.IDADE >= ini && +v.IDADE <= until) {
                    p[i].grupo = ini + ' a ' + until;
                    if (v.SEXO === 'Masculino') ++p[i].Masculino;
                    if (v.SEXO === 'Feminino') ++p[i].Feminino;
                }
                if (+v.IDADE > (end - 1) && ini == end) {
                    p[i].grupo = '> ' + (end - 1);
                    if (v.SEXO === 'Masculino') ++p[i].Masculino;
                    if (v.SEXO === 'Feminino') ++p[i].Feminino;
                }
                ini = ini + step;
            }
        }
        return p;
    }, (p, v) => {
        let ini = 16;
        let step = 3;
        let end = 49;
        let until = 0;
        for (var i = 0; i < 12; i++) {
            if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido') {
                until = ini + step - 1;
                if (+v.IDADE >= ini && +v.IDADE <= until) {
                    p[i].grupo = ini + ' a ' + until;
                    if (v.SEXO === 'Masculino') --p[i].Masculino;
                    if (v.SEXO === 'Feminino') --p[i].Feminino;
                }
                if (+v.IDADE > (end - 1) && ini == end) {
                    p[i].grupo = '> ' + (end - 1);
                    if (v.SEXO === 'Masculino') --p[i].Masculino;
                    if (v.SEXO === 'Feminino') --p[i].Feminino;
                }
                ini = ini + step;
            }
        }
        return p;
    }, () => {
        return [
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
            { grupo: '', Masculino: 0, Feminino: 0 },
        ]
    });

    let generoGrupo = generoDim.group().reduce(reduceAddEvadidos, reduceRemoveEvadidos, reduceInitialEvadidos);
    let grauGrupo = grauDim.group().reduce(reduceAddEvadidos, reduceRemoveEvadidos, reduceInitialEvadidos);
    let modalidadeGrupo = modalidadeDim.group().reduce(reduceAddEvadidos, reduceRemoveEvadidos, reduceInitialEvadidos);
    let bolsaGrupo = bolsaDim.group().reduce(reduceAddEvadidos, reduceRemoveEvadidos, reduceInitialEvadidos);

    let evasaoRacaGrupo = racaDim.group().reduce((p, v) => {
        if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido')
            ++p.evadidos;
        if (v.ANO_CENSO === v.ANO_INGRESSO)
            ++p.ingressantes;
        if (v.SITUACAO === 'Formado')
            ++p.formados;
        return p;
    }, (p, v) => {
        if (v.SITUACAO === 'Desistente' || v.SITUACAO === 'Transferido')
            --p.evadidos;
        if (v.ANO_CENSO === v.ANO_INGRESSO)
            --p.ingressantes;
        if (v.SITUACAO === 'Formado')
            --p.formados;
        return p;
    }, () => ({
        evadidos: 0,
        ingressantes: 0,
        formados: 0
    }));

    let poloGrupo = poloDim.group().reduce(reduceAddEvadidos, reduceRemoveEvadidos, reduceInitialEvadidos);

    // ESCALAS
    let xAnoEvasao = d3.scaleLinear().domain([2015 - 0.5, 2019 + 0.5]);
    let xTotalEvasaoCurso = d3.scaleLinear().domain([0, evasaoPorCursoGrupo2019Top10.all()[0].value]);



    // EVASÃO POR ANO
    var ano_sel = '';

    compositeChart.width(500)
        .height(400)
        .margins({ top: 80, right: 50, bottom: 40, left: 50 })
        .clipPadding(40)
        .renderHorizontalGridLines(true)
        .shareTitle(false)
        .x(xAnoEvasao)
        .dimension(anoDim)
        .legend(dc.legend().x(20).y(10).itemHeight(13).gap(5))
        .brushOn(false)
        .elasticY(false)
        .compose([
            dc.barChart(compositeChart)
                .renderHorizontalGridLines(true)
                .renderLabel(true)
                .group(evadidosPorAnoGrupo, "Evadidos")
                .brushOn(false)
                .ordinalColors(['steelblue'])
                .elasticY(false)
                .gap(20)
                .centerBar(true),
            dc.lineChart(compositeChart)
                .renderLabel(true)
                .elasticY(false)
                .group(taxaEvasaoPorAnoGrupo, "Taxa de Evasão (%)")
                .valueAccessor(function (d) {
                    return d.value.taxa;
                })
                .ordinalColors(['darkorange'])
                .useRightYAxis(true)
        ])
        .yAxisLabel("Evadidos")
        .rightYAxisLabel("Taxa de Evasão (%)")
        .rightY(d3.scaleLinear().domain([0, 100]))
        .on('renderlet', function (chart) {
            chart.selectAll('.line')
                .style('fill', 'none')
                .style('stroke-width', '3px');

            chart.selectAll('.bar').on('click', function (e) {

                if ($('#chart1 .bar.selected').length > 0) {
                    $('#chart1 .bar').removeClass('selected');
                    $('#chart1 .bar').addClass('deselected');

                    $(this).removeClass('deselected');
                    $(this).addClass('selected');
                }
                else {
                    $(this).addClass('selected');
                    $('#chart1 .bar').not(".selected").addClass('deselected');
                }

                let ano = e.x;

                if (ano === ano_sel) {
                    ano = null;
                    ano_sel = '';
                    $('#chart1 .bar').removeClass('selected').removeClass('deselected');
                }
                else {
                    ano_sel = ano;
                }

                addTextFilter(ano, 'ano');

                anoDim.filter(ano);

                updatePyramidChart(ano);
                updateRadarChart();
                updateMarkers();
                dc.redrawAll();
            })
        });

    compositeChart.xAxis().ticks(5);
    compositeChart.xAxis().tickFormat(d3.format("d"));
    compositeChart.yAxis().tickFormat(d3.format("d"));
    compositeChart.render();


    // ROW CHART
    rowChart.width(530)
        .height(400)
        .dimension(sitDim)
        .group(evasaoPorCursoGrupo2019Top10, "Curso")
        .x(xTotalEvasaoCurso)
        .elasticX(true)
        .controlsUseVisibility(false)
        .gap(5)
        .ordinalColors(['steelblue'])
        .on("filtered", function (chart, filter) {
            if (chart._filters.length == 0) {
                removeTextFilter('curso');
            }
            else {
                addTextFilter(filter, 'curso');
            }
                
            updateAllCharts();
        })
    
    rowChart.addFilterHandler(function (filters, filter) {
        filters.length = 0; // empty the array
        filters.push(filter);
        return filters;
    });    

    rowChart.xAxis().tickFormat(d3.format("d"));
    rowChart.render();



    //EVASÃO POR ORIGEM ESCOLAR
    var ano_sel = '';
    var escola_sel = '';
    chart.width(450)
        .height(400)
        .margins({ top: 80, right: 50, bottom: 25, left: 60 })
        .clipPadding(20)
        .renderHorizontalGridLines(true)
        .x(xAnoEvasao)
        //.x(d3.scaleLinear().domain([2015,2019]))
        .elasticY(true)
        .brushOn(false)
        .title(function (d) {
            return d.key + ' : ' + this.layer + ' : ' + ((d.value[this.layer]).toFixed(2) * 100) + '%';
        })
        .dimension(anoDim)
        .group(evasaoOrigemAnoGrupo, 'Sem resposta', sel_stack('Sem resposta'))
        .gap(20)
        .centerBar(true)
        .renderLabel(false)
        .on("filtered", function (chart, filter) {
            updateMarkers()
        });

    chart.on('renderlet', function (chart) {
        chart.selectAll('.line')
            .style('fill', 'none')
            .style('stroke-width', '3px');

        chart.selectAll('.bar').on('click', function (e) {

            if ($('#chart3 .bar.selected').length > 0) {
                $('#chart3 .bar').removeClass('selected');
                $('#chart3 .bar').addClass('deselected');

                $(this).removeClass('deselected');
                $(this).addClass('selected');
            }
            else {
                $(this).addClass('selected');
                $('#chart3 .bar').not(".selected").addClass('deselected');
            }

            let ano = e.x;
            let escola = e.layer;

            if (ano === ano_sel && escola === escola_sel) {
                ano = null;
                ano_sel = '';
                escola = null;
                escola_sel = '';
                $('#chart3 .bar').removeClass('selected').removeClass('deselected');
                removeTextFilter('ano');
                removeTextFilter('escola');
            }
            else {
                ano_sel = ano;
                escola_sel = escola;
                addTextFilter(ano, 'ano');
                addTextFilter(escola, 'escola');
            }

            anoDim.filter(ano);
            tipoEscolaDim.filter(escola);
            updatePyramidChart(ano);
            updateRadarChart();
            updateMarkers();
            dc.redrawAll();
        })

    });

    chart.legend(dc.legend().x(20).y(5).itemHeight(13).gap(5))

    chart.stack(evasaoOrigemAnoGrupo, 'Privada', sel_stack('Privada'));
    chart.stack(evasaoOrigemAnoGrupo, 'Publica', sel_stack('Publica'));

    chart.xAxis().ticks(5);
    chart.xAxis().tickFormat(d3.format("d"));
    chart.yAxis().tickFormat(d3.format(".0%"));
    chart.ordinalColors(['DarkGray', 'darkorange', 'steelBlue']);
    chart.render();


    let data_pyramide = transformDataPyramide(evasaoGeneroGrupo.all());
    pyramidChart("#chart4", data_pyramide);


    pieChartGenero.width(220)
        .height(300)
        .slicesCap(4)
        .innerRadius(40)
        .dimension(generoDim)
        .group(generoGrupo)
        .legend(dc.legend().highlightSelected(true))
        //.ordinalColors(['steelblue','darkorange'])
        // workaround for #703: not enough data is accessible through .label() to display percentages
        .on('pretransition', function (chart) {
            chart.selectAll('text.pie-slice').text(function (d) {
                return dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2 * Math.PI) * 100) + '%';
            }).style('font-weight', 'bold');
        })
        .on("filtered", function (chart, filter) {
            if (chart._filters.length == 0) {
                removeTextFilter('genero');
            }
            else {
                addTextFilter(filter, 'genero');
            }
            updateAllCharts();
        })
        .render();

    pieChartGrau.width(220)
        .height(300)
        .slicesCap(2)
        .innerRadius(40)
        .dimension(grauDim)
        .group(grauGrupo)
        .legend(dc.legend().highlightSelected(true))
        //.ordinalColors(['steelblue','darkorange','DarkGray'])
        // workaround for #703: not enough data is accessible through .label() to display percentages
        .on('pretransition', function (chart) {
            chart.selectAll('text.pie-slice').text(function (d) {
                return dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2 * Math.PI) * 100) + '%';
            }).style('font-weight', 'bold');
        })
        .on("filtered", function (chart, filter) {
            if (chart._filters.length == 0) {
                removeTextFilter('grau');
            }
            else {
                addTextFilter(filter, 'grau');
            }
            updateAllCharts();
        })
        .render();
    
    pieChartBolsa.width(220)
        .height(300)
        .slicesCap(3)
        .innerRadius(40)
        .dimension(bolsaDim)
        .group(bolsaGrupo)
        //.legend(dc.legend().highlightSelected(true))
        .legend(dc.legend().highlightSelected(true).legendText(function (d) {
            if (d.name === false) return 'Não';
            if (d.name === true) return 'Sim';
        }))
        //.ordinalColors(['steelblue','darkorange','DarkGray'])
        // workaround for #703: not enough data is accessible through .label() to display percentages
        .on('pretransition', function (chart) {
            chart.selectAll('text.pie-slice').text(function (d) {
                return dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2 * Math.PI) * 100) + '%';
            }).style('font-weight', 'bold');
        })
        .on("filtered", function (chart, filter) {
            if (chart._filters.length == 0) {
                removeTextFilter('bolsa');
            }
            else {
                let _f = "Sim";
                if (filter == false) _f = "Não";

                addTextFilter(_f, 'bolsa');
            }
            updateAllCharts();
        })
        .render();

    pieChartModalidade.width(220)
        .height(300)
        .slicesCap(4)
        .innerRadius(40)
        .dimension(modalidadeDim)
        .group(modalidadeGrupo)
        .legend(dc.legend().highlightSelected(true))
        //.ordinalColors(['steelblue','darkorange'])
        // workaround for #703: not enough data is accessible through .label() to display percentages
        .on('pretransition', function (chart) {
            chart.selectAll('text.pie-slice').text(function (d) {
                return dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2 * Math.PI) * 100) + '%';
            }).style('font-weight', 'bold');
        })
        .on("filtered", function (chart, filter) {
            if (chart._filters.length == 0) {
                removeTextFilter('modalidade');
            }
            else {
                addTextFilter(filter, 'modalidade');
            }
            updateAllCharts();
        })
        .render();
    

    // EVASÃO POR ANOS CURSADOS
    lineChart.margins({ top: 40, right: 50, bottom: 40, left: 80 })
        .width(1100)
        .height(400)
        .renderArea(true)
        .brushOn(true)
        .x(d3.scaleBand())
        //.x(d3.scaleLinear().domain([0,10]))
        .xUnits(dc.units.ordinal)
        .renderDataPoints(true)
        .clipPadding(40)
        .elasticY(true)
        .dimension(tempDimension)
        .group(evadidosTempoDeCursoGroup)
        .xAxisLabel('Anos cursados')
        .yAxisLabel('Quantidade de evadidos')
        .ordinalColors(['darkorange'])
        .renderDataPoints({ fillOpacity: 0.8, strokeOpacity: 0.0, radius: 4 })
        .title(function (d) {
            return "Anos de curso:  " + d.key + " ano(s)\n" +
                "Quantidade de evadidos: " + d.value;
        })
        .on('renderlet', function (chart) {
            chart.selectAll('.line')
                .style('fill', 'none')
                .style('stroke-width', '1px');
        })
        .on("filtered", function (chart, filter) {
            updateMarkers();
            updateRadarChart();
        })
        .render();

    lineChart.xAxis().ticks(10);
    if (evadidosTempoDeCursoGroup.top(1)[0].value <= 10)
        lineChart.yAxis().ticks(evadidosTempoDeCursoGroup.top(1)[0].value);

    lineChart.xAxis().tickFormat(d3.format("d"));
    lineChart.yAxis().tickFormat(d3.format("d"));

    var colorRadarChart = d3.scaleOrdinal()
        .range(["#00A0B0", "#CC333F", "#EDC951"]);
    
    let radarChartOptions = {
        w: 450,
        h: 380,
        margin: { top: 80, right: 20, bottom: 80, left: 30 },
        maxValue: 0.5,
        levels: 5,
        roundStrokes: true,
        color: colorRadarChart,
        namesRadar: ['Ingressantes', 'Evadidos', 'Formados']
        
    };

    let data_radar = transformData(evasaoRacaGrupo.all())
    RadarChart('#chart6', data_radar, radarChartOptions);

    //mapa
    let municipiosCeara = municipios.filter(function (d) { return (d.codigo_uf == "23") });

    
    let _muniMap = function () {
        let muniMap = new Map();
        municipiosCeara.forEach(function (d) {
            muniMap.set(d.codigo_ibge, { nome: d.nome, lat: d.latitude, long: d.longitude });
        })
        return muniMap;
    };

    let layerList = [];



    let logScale = d3.scaleLog()
        .domain([10, 1000000])
        .range([0, 50000]);

    let _map = () => {
        let mapInstance = L.map('mapid').setView([-5.2731234, -39.3550498], 7)
            .on('click', function (e) {
                poloDim.filter(null);
                removeTextFilter('local');
                updateMarkers();
                updatePyramidChart();
                updateRadarChart();
                dc.redrawAll();
            });

        //mapInstance.on('moveend', updateFilters)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://www.openstreetmap.org/">OpenStreetMap</a> contributors',
            maxZoom: 17
        }).addTo(mapInstance)

        return mapInstance
    }

    let map = _map();
    let muniMap = _muniMap();

    var clicked;

    var clickStyle = {
        color: 'darkorange',
        weight: 2,
        fillColor: 'darkorange',
        fillOpacity: 0.2
    }
    var unclickStyle = {
        color: 'steelBlue',
        weight: 2,
        fillColor: 'steelBlue',
        fillOpacity: 0.2
    }


    function updateMarkers() {
        if (layerList.length == 1) {
            layerList[0].clearLayers() //remove circles in layerGroup
            if (map.hasLayer(layerList[0])) {
                map.removeLayer(layerList[0]) //remove layerGroup if present
            }
        }
        let todisplay = new Array(poloGrupo.all().length)
        let i = 0;
        poloGrupo.all().forEach(function (d) {
            if (d.value > 0) {
                let size = logScale(d.value * 10);
                let circle = L.circle([muniMap.get(parseInt(d.key)).lat, muniMap.get(parseInt(d.key)).long], size, unclickStyle)
                //circle.bindPopup("Polo: "+muniMap.get(parseInt(d.key)).nome + "<br>Evadidos: "+d.value)
                circle.bindTooltip("Local da oferta: " + muniMap.get(parseInt(d.key)).nome + "<br>Evadidos: " + d.value,
                    {
                        permanent: false,
                        direction: 'right'
                    })
                circle.on('click', function (e) {
                    if (clicked) {
                        clicked.setStyle(unclickStyle);
                    }
                    e.target.setStyle(clickStyle);
                    clicked = e.target;

                    L.DomEvent.stopPropagation(e);
                    poloDim.filter(d.key);
                    addTextFilter(muniMap.get(parseInt(d.key)).nome, 'local');
                    updatePyramidChart();
                    updateRadarChart();
                    dc.redrawAll();
                })

                circle.publicid = parseInt(d.key)
                todisplay[i++] = circle;
            }
        })
        todisplay = todisplay.filter(function (e) { return e })
        layerList[0] = L.layerGroup(todisplay).addTo(map) //add it again passing the array of markers
    }

    //chamada principal para o mapa
    updateMarkers();

    function pyramidChart(id, data) {
        // SET UP DIMENSIONS
        var w = 450,
            h = 300;

        // margin.middle is distance from center line to each y-axis
        var margin = {
            top: 60,
            right: 20,
            bottom: 40,
            left: 20,
            middle: 28
        };

        // the width of each side of the chart
        var regionWidth = w / 2 - margin.middle;

        // these are the x-coordinates of the y-axes
        var pointA = regionWidth,
            pointB = w - regionWidth;


        // GET THE TOTAL POPULATION SIZE AND CREATE A FUNCTION FOR RETURNING THE PERCENTAGE
        var totalPopulation = d3.sum(data, function (d) { return d.Masculino + d.Feminino; }),
            percentage = function (d) { return d / totalPopulation; };

        //remove svg old
        d3.select(id).select("svg").remove();

        // CREATE SVG
        var svg = d3.select(id).append('svg')
            .attr('width', margin.left + w + margin.right)
            .attr('height', margin.top + h + margin.bottom)
            // ADD A GROUP FOR THE SPACE WITHIN THE MARGINS
            .append('g')
            .attr('transform', translation(margin.left, margin.top));

        // find the maximum data value on either side
        //  since this will be shared by both of the x-axes
        var maxValue = Math.max(
            d3.max(data, d => percentage(d.Masculino)),
            d3.max(data, d => percentage(d.Feminino)),
        );

        // SET UP SCALES

        // the xScale goes from 0 to the width of a region
        //  it will be reversed for the left x-axis
        var xScale = d3.scaleLinear()
            .domain([0, maxValue])
            .rangeRound([0, regionWidth])
            .nice();

        var xScaleLeft = d3.scaleLinear()
            .domain([0, maxValue])
            .range([regionWidth, 0]);

        var xScaleRight = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, regionWidth]);

        var yScale = d3.scaleBand()
            .domain(data.map(d => d.grupo))
            .rangeRound([h, 0], 0.1).padding(0.2);


        // SET UP AXES
        var yAxisLeft = d3.axisRight(yScale)
            .tickSize(6, 0)
            .tickPadding(margin.middle - 6);

        var yAxisRight = d3.axisLeft(yScale)
            .tickSize(6, 0)
            .tickFormat('');

        var xAxisRight = d3.axisBottom(xScale)
            .ticks(5)
            .tickFormat(d3.format('.1%'));

        // REVERSE THE X-AXIS SCALE ON THE LEFT SIDE BY REVERSING THE RANGE
        var xAxisLeft = d3.axisBottom(xScale.copy().range([pointA, 0]))
            .ticks(5)
            .tickFormat(d3.format('.1%'));

        // MAKE GROUPS FOR EACH SIDE OF CHART
        // scale(-1,1) is used to reverse the left side so the bars grow left instead of right
        var leftBarGroup = svg.append('g')
            .attr('transform', translation(pointA, 0) + 'scale(-1,1)');
        var rightBarGroup = svg.append('g')
            .attr('transform', translation(pointB, 0));

        // DRAW AXES
        svg.append('g')
            .attr('class', 'axis y left')
            .attr('transform', translation(pointA, 0))
            .call(yAxisLeft)
            .selectAll('text')
            .style('font-size', '10px')
            .style('text-anchor', 'middle');

        svg.append('g')
            .attr('class', 'axis y right')
            .attr('transform', translation(pointB, 0))
            .call(yAxisRight)
            .append("text")
            .attr("class", "axis-title")
            .attr("y", -35)
            .attr("dy", "1em")
            .attr("dx", "8px")
            .style('font-size', '13px')
            .style("text-anchor", "end")
            .attr("fill", "#5D6971")
            .text("Faixa Etária");

        svg.append('g')
            .attr('class', 'axis x left')
            .attr('transform', translation(0, h))
            .call(xAxisLeft);

        svg.append('g')
            .attr('class', 'axis x right')
            .attr('transform', translation(pointB, h))
            .call(xAxisRight)
            .append("text")
            .attr("class", "axis-title")
            .attr("y", 40)
            .attr("dy", "1em")
            .attr("dx", "4em")
            .style('font-size', '12px')
            .style("text-anchor", "end")
            .attr("fill", "#5D6971")
            .text("Quantidade de Evadidos");

        // DRAW BARS
        leftBarGroup.selectAll('.bar.left')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar left')
            .attr("fill", "steelblue")
            .attr('x', 0)
            .attr('y', d => yScale(d.grupo))
            .attr('width', d => xScale(percentage(d.Masculino)))
            .attr('height', yScale.bandwidth())
            .on('mouseover', function (d, i) {
                //Dim all blobs
                d3.selectAll(".bar.left")
                    .transition().duration(200)
                    .style("fill-opacity", 0.5);
                //Bring back the hovered over blob
                d3.select(this)
                    .transition().duration(200)
                    .style("fill-opacity", 0.9);
            })
            .on('mouseout', function () {
                //Bring back all blobs
                d3.selectAll(".bar.left")
                    .transition().duration(200)
                    .style("fill-opacity", 1);
            })
            .style('cursor', 'pointer')
            .append('title')
            .text((d, i) => d.grupo + " - Masculino : " + (percentage(d.Masculino)*100).toFixed(0)+"%")
            .style("font-size", "16px");

        rightBarGroup.selectAll('.bar.right')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar right')
            .attr("fill", "darkorange")
            .attr('x', 0)
            .attr('y', d => yScale(d.grupo))
            .attr('width', d => xScale(percentage(d.Feminino)))
            .attr('height', yScale.bandwidth())
            .on('mouseover', function (d, i) {
                //Dim all blobs
                d3.selectAll(".bar.right")
                    .transition().duration(200)
                    .style("fill-opacity", 0.5);
                //Bring back the hovered over blob
                d3.select(this)
                    .transition().duration(200)
                    .style("fill-opacity", 0.9);
            })
            .on('mouseout', function () {
                //Bring back all blobs
                d3.selectAll(".bar.right")
                    .transition().duration(200)
                    .style("fill-opacity", 1);
            })
            .style('cursor', 'pointer')
            .append('title')
            .text((d, i) => d.grupo + " - Feminino : " + (percentage(d.Feminino)*100).toFixed(0)+"%")
            .style("font-size", "16px");


        // so sick of string concatenation for translations
        function translation(x, y) {
            return 'translate(' + x + ',' + y + ')';
        }

        svg.append("rect").attr("x", w - 100).attr("y", -40).attr("width", 10).attr("height", 10).style("fill", "steelblue");
        svg.append("rect").attr("x", w - 100).attr("y", -25).attr("width", 10).attr("height", 10).style("fill", "darkorange");
        svg.append("text").attr("x", w - 80).attr("y", -35).text("Masculino").style("font-size", "14px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", w - 80).attr("y", -20).text("Feminino").style("font-size", "14px").attr("alignment-baseline", "middle")

    }

    function updatePyramidChart(ano = null) {
        let data = transformDataPyramide(evasaoGeneroGrupo.all(), ano)
        pyramidChart('#chart4', data)
    }

    function transformDataPyramide(data, ano = null) {
        let saida = [];
        var temp = [];

        if (ano != null) {
            data.forEach(function (d, i) {
                if (d.key == ano) {
                    d.value.forEach(function (o, j) {
                        if (!temp[j]) {
                            temp[j] = { grupo: o.grupo, Masculino: o.Masculino, Feminino: o.Feminino };
                        }
                        else {
                            temp[j].grupo = o.grupo;
                            temp[j].Masculino += o.Masculino;
                            temp[j].Feminino += o.Feminino;
                        }
                    })
                }
            })
        }
        else {
            data.forEach(function (d, i) {
                d.value.forEach(function (o, j) {
                    if (!temp[j]) {
                        temp[j] = { grupo: o.grupo, Masculino: o.Masculino, Feminino: o.Feminino };
                    }
                    else {
                        temp[j].grupo = o.grupo;
                        temp[j].Masculino += o.Masculino;
                        temp[j].Feminino += o.Feminino;
                    }
                })
            })
        }
        return temp;
    }


    /////////////////////////////////////////////////////////
    /////////////// The Radar Chart Function ////////////////
    /////////////// Written by Nadieh Bremer ////////////////
    ////////////////// VisualCinnamon.com ///////////////////
    /////////// Inspired by the code of alangrafu ///////////
    /////////////////////////////////////////////////////////

    function RadarChart(id, data, options) {
        var cfg = {
            w: 450,				//Width of the circle
            h: 400,				//Height of the circle
            margin: { top: 20, right: 20, bottom: 20, left: 20 }, //The margins of the SVG
            levels: 3,				//How many levels or inner circles should there be drawn
            maxValue: 0, 			//What is the value that the biggest circle will represent
            labelFactor: 1.25, 	//How much farther than the radius of the outer circle should the labels be placed
            wrapWidth: 60, 		//The number of pixels after which a label needs to be given a new line
            opacityArea: 0.35, 	//The opacity of the area of the blob
            dotRadius: 4, 			//The size of the colored circles of each blog
            opacityCircles: 0.1, 	//The opacity of the circles of each blob
            strokeWidth: 2, 		//The width of the stroke around each blob
            roundStrokes: false,	//If true the area and stroke will follow a round path (cardinal-closed)
            color: d3.schemeCategory10,	//Color function
            namesRadar: ['Tipo 1', 'Tipo 2', 'Tipo 3']
        };

        //Put all of the options into a variable called cfg
        if ('undefined' !== typeof options) {
            for (var i in options) {
                if ('undefined' !== typeof options[i]) { cfg[i] = options[i]; }
            }//for i
        }//if
        //If the supplied maxValue is smaller than the actual one, replace by the max in the data
        var maxValue = Math.max(cfg.maxValue, d3.max(data, function (i) { return d3.max(i.map(function (o) { return Math.ceil(o.value / 0.1) * 0.1; })) }));

        var allAxis = (data[0].map(function (i, j) { return i.axis })),	//Names of each axis
            total = allAxis.length,					//The number of different axes
            radius = Math.min(cfg.w / 2, cfg.h / 2), 	//Radius of the outermost circle
            Format = d3.format('.0%'),			 	//Percentage formatting
            angleSlice = Math.PI * 2 / total;		//The width in radians of each "slice"
        //Scale for the radius
        var rScale = d3.scaleLinear()
            .range([0, radius])
            .domain([0, maxValue]);

        /////////////////////////////////////////////////////////
        //////////// Create the container SVG and g /////////////
        /////////////////////////////////////////////////////////

        //Remove whatever chart with the same id/class was present before
        d3.select(id).select("svg").remove();

        //Initiate the radar chart SVG
        var svg = d3.select(id).append("svg")
            .attr("width", cfg.w + cfg.margin.left + cfg.margin.right)
            .attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
            .attr("class", "radar" + id);
        //Append a g element		
        var g = svg.append("g")
            .attr("transform", "translate(" + (cfg.w / 2 + cfg.margin.left) + "," + (cfg.h / 2 + cfg.margin.top) + ")");

        /////////////////////////////////////////////////////////
        ////////// Glow filter for some extra pizzazz ///////////
        /////////////////////////////////////////////////////////

        //Filter for the outside glow
        var filter = g.append('defs').append('filter').attr('id', 'glow'),
            feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur'),
            feMerge = filter.append('feMerge'),
            feMergeNode_1 = feMerge.append('feMergeNode').attr('in', 'coloredBlur'),
            feMergeNode_2 = feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        /////////////////////////////////////////////////////////
        /////////////// Draw the Circular grid //////////////////
        /////////////////////////////////////////////////////////

        //Wrapper for the grid & axes
        var axisGrid = g.append("g").attr("class", "axisWrapper");

        //Draw the background circles
        axisGrid.selectAll(".levels")
            .data(d3.range(1, (cfg.levels + 1)).reverse())
            .enter()
            .append("circle")
            .attr("class", "gridCircle")
            .attr("r", function (d, i) { return radius / cfg.levels * d; })
            .style("fill", "#CDCDCD")
            .style("stroke", "#CDCDCD")
            .style("fill-opacity", cfg.opacityCircles)
            .style("filter", "url(#glow)");

        //Text indicating at what % each level is
        axisGrid.selectAll(".axisLabel")
            .data(d3.range(1, (cfg.levels + 1)).reverse())
            .enter().append("text")
            .attr("class", "axisLabel")
            .attr("x", 4)
            .attr("y", function (d) { return -d * radius / cfg.levels; })
            .attr("dy", "0.4em")
            .style("font-size", "12px")
            .attr("fill", "#737373")
            .text(function (d, i) { return Format(maxValue * d / cfg.levels); });

        /////////////////////////////////////////////////////////
        //////////////////// Draw the axes //////////////////////
        /////////////////////////////////////////////////////////

        //Create the straight lines radiating outward from the center
        var axis = axisGrid.selectAll(".axis")
            .data(allAxis)
            .enter()
            .append("g")
            .attr("class", "axis");
        //Append the lines
        axis.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", function (d, i) { return rScale(maxValue * 1.1) * Math.cos(angleSlice * i - Math.PI / 2); })
            .attr("y2", function (d, i) { return rScale(maxValue * 1.1) * Math.sin(angleSlice * i - Math.PI / 2); })
            .attr("class", "line")
            .style("stroke", "white")
            .style("stroke-width", "2px");

        //Append the labels at each axis
        axis.append("text")
            .attr("class", "legend")
            .style("font-size", "14px")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("x", function (d, i) { return rScale(maxValue * cfg.labelFactor) * Math.cos(angleSlice * i - Math.PI / 2); })
            .attr("y", function (d, i) { return rScale(maxValue * cfg.labelFactor) * Math.sin(angleSlice * i - Math.PI / 2); })
            .text(function (d) { return d })
            .call(wrap, cfg.wrapWidth);

        /////////////////////////////////////////////////////////
        ///////////// Draw the radar chart blobs ////////////////
        /////////////////////////////////////////////////////////

        //The radial line function
        var radarLine = d3.lineRadial()
            .curve(d3.curveCardinalClosed)
            .radius(function (d) { return rScale(d.value); })
            .angle(function (d, i) { return i * angleSlice; });

        if (cfg.roundStrokes) {
            radarLine.curve(d3.curveCardinalClosed);
        }

        //Create a wrapper for the blobs	
        var blobWrapper = g.selectAll(".radarWrapper")
            .data(data)
            .enter().append("g")
            .attr("class", "radarWrapper");

        //Append the backgrounds	
        blobWrapper
            .append("path")
            .attr("class", "radarArea")
            .attr("d", function (d, i) { return radarLine(d); })
            .style("fill", function (d, i) { return cfg.color(i); })
            .style("fill-opacity", cfg.opacityArea)
            .style("cursor", "pointer")
            .on('mouseover', function (d, i) {
                //Dim all blobs
                d3.selectAll(".radarArea")
                    .transition().duration(200)
                    .style("fill-opacity", 0.1);
                //Bring back the hovered over blob
                d3.select(this)
                    .transition().duration(200)
                    .style("fill-opacity", 0.7);
            })
            .on('mouseout', function () {
                //Bring back all blobs
                d3.selectAll(".radarArea")
                    .transition().duration(200)
                    .style("fill-opacity", cfg.opacityArea);
            })
            .append('title')
            .text((d, i) => cfg.namesRadar[i])
            .style("font-size", "16px");

        //Create the outlines	
        blobWrapper.append("path")
            .attr("class", "radarStroke")
            .attr("d", function (d, i) { return radarLine(d); })
            .style("stroke-width", cfg.strokeWidth + "px")
            .style("stroke", function (d, i) { return cfg.color(i); })
            .style("fill", "none")
            .style("filter", "url(#glow)");


        //Append the circles
        blobWrapper.selectAll(".radarCircle")
            .data(function (d, i) { return d; })
            .enter().append("circle")
            .attr("class", "radarCircle")
            .attr("r", cfg.dotRadius)
            .attr("cx", function (d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
            .attr("cy", function (d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
            .style("fill", "#888")
            .style("fill-opacity", 0.8);

        /////////////////////////////////////////////////////////
        //////// Append invisible circles for tooltip ///////////
        /////////////////////////////////////////////////////////

        //Wrapper for the invisible circles on top
        var blobCircleWrapper = g.selectAll(".radarCircleWrapper")
            .data(data)
            .enter().append("g")
            .attr("class", "radarCircleWrapper");

        //Append a set of invisible circles on top for the mouseover pop-up
        blobCircleWrapper.selectAll(".radarInvisibleCircle")
            .data(function (d, i) { return d; })
            .enter().append("circle")
            .attr("class", "radarInvisibleCircle")
            .attr("r", cfg.dotRadius * 1.5)
            .attr("cx", function (d, i) { return rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2); })
            .attr("cy", function (d, i) { return rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2); })
            .style("fill", "none")
            .style("pointer-events", "all")
            .on("mouseover", function (d, i) {
                let newX = parseFloat(d3.select(this).attr('cx')) - 10;
                let newY = parseFloat(d3.select(this).attr('cy')) - 10;

                tooltip
                    .attr('x', newX)
                    .attr('y', newY)
                    .text(Format(d.value))
                    .transition().duration(200)
                    .style('opacity', 1);
            })
            .on("mouseout", function () {
                tooltip.transition().duration(200)
                    .style("opacity", 0);
            });

        svg.append("rect").attr("x", cfg.w - 100).attr("y", 20).attr("width", 10).attr("height", 10).style("fill", "#00A0B0");
        svg.append("rect").attr("x", cfg.w - 100).attr("y", 40).attr("width", 10).attr("height", 10).style("fill", "#CC333F");
        svg.append("rect").attr("x", cfg.w - 100).attr("y", 60).attr("width", 10).attr("height", 10).style("fill", "#EDC951");
        svg.append("text").attr("x", cfg.w - 80).attr("y", 25).text("Ingressantes").style("font-size", "14px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", cfg.w - 80).attr("y", 45).text("Evadidos").style("font-size", "14px").attr("alignment-baseline", "middle")
        svg.append("text").attr("x", cfg.w - 80).attr("y", 65).text("Formados").style("font-size", "14px").attr("alignment-baseline", "middle")

        //Set up the small tooltip for when you hover over a circle
        var tooltip = g.append("text")
            .attr("class", "tooltip")
            .style("opacity", 0);

        /////////////////////////////////////////////////////////
        /////////////////// Helper Function /////////////////////
        /////////////////////////////////////////////////////////

        //Taken from http://bl.ocks.org/mbostock/7555321
        //Wraps SVG text	
        function wrap(text, width) {
            text.each(function () {
                var text = d3.select(this),
                    words = text.text().split(/\s+/).reverse(),
                    word,
                    line = [],
                    lineNumber = 0,
                    lineHeight = 1.4, // ems
                    y = text.attr("y"),
                    x = text.attr("x"),
                    dy = parseFloat(text.attr("dy")),
                    tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
            });
        }//wrap	

    }//RadarChart

    function updateRadarChart() {
        let data = transformData(evasaoRacaGrupo.all());
        RadarChart("#chart6", data, radarChartOptions);
    }


    function transformData(data) {
        let saida = [];
        let temp = [];
        let keys = (data.map(function (j) { return j.key }))
        let tot = 0;
        for (var x = 0; x < 3; x++) {
            keys.forEach(function (k, j) {
                data.forEach(function (d, i) {
                    if (x == 1) {
                        if (d.key === k) {
                            tot = (d.value.evadidos + d.value.ingressantes + d.value.formados)
                            if (tot > 0)
                                temp.push({ axis: k, value: d.value.evadidos / tot });
                            else
                                temp.push({ axis: k, value: 0 });
                        }
                    }
                    if (x == 0) {
                        if (d.key === k) {
                            tot = (d.value.evadidos + d.value.ingressantes + d.value.formados)
                            if (tot > 0)
                                temp.push({ axis: k, value: d.value.ingressantes / tot });
                            else
                                temp.push({ axis: k, value: 0 });
                        }
                    }
                    if (x == 2) {
                        if (d.key === k) {
                            tot = (d.value.evadidos + d.value.ingressantes + d.value.formados)
                            if (tot > 0)
                                temp.push({ axis: k, value: d.value.formados / tot });
                            else
                                temp.push({ axis: k, value: 0 });
                        }
                    }
                })
            })
            saida.push(temp);
            temp = [];
        }

        return saida;
    }



    function updateAllCharts() {
        updateMarkers();
        updateRadarChart();
        updatePyramidChart();
    }

    function addTextFilter(t, c) {
        let _t = c == 'bolsa'? ("Bolsa: " + t) : t;
        let text = "<li class= '" + c + "'><span class='text-dark'>" + _t + "</span></li>";
        let has = $('.' + c).length;
        let qtd = parseInt($('#qtde-filter').text());

        if (has == 0) {
            $('#itens').prepend(text);  
            qtd++;
        }
        
        $('#qtde-filter').text(qtd);

        showFilters();
    }

    function removeTextFilter(c) {
                
        let has = $('.' + c).length;
        let qtd = parseInt($('#qtde-filter').text());
        
        if (has > 0) {
            $('.' + c).remove();
            qtd--;
        }
        
        
        $('#qtde-filter').text(qtd);

        showFilters();
        
    }

    function showFilters() {
        let qtd = parseInt($('#qtde-filter').text());
        if (qtd <= 0) {
            $('#btn-filter').addClass('invisible');
        }
        else {
            $('#btn-filter').removeClass('invisible');
        }
    }

    function resetFilters() {
        
        $('#chart1 .bar').removeClass('deselected');
        $('#chart3 .bar').removeClass('deselected');


        $('#itens ul li').remove();
        $('#qtde-filter').text(0);

        showFilters();

        dc.filterAll();
        dc.redrawAll();
    }

    $('#btn-reset').on('click', resetFilters);

}

