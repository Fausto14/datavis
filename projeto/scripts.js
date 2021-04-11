var compositeChart = new dc.CompositeChart("#chart1");
var rowChart = new dc.RowChart("#chart2");
var chart = new dc.BarChart("#chart3");
var lineChart = new dc.LineChart("#evasaoporquantidade");

d3.csv('https://raw.githubusercontent.com/Fausto14/datavis/main/CENSO_2015_2019_UFC.csv').then(function (data) {

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

                anoDim.filter(ano);

                updatePyramidChart(ano);
                //updateRadarChart();
                //updateMarkers();
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
            updateAllCharts();
        })
        
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
            }
            else {
                ano_sel = ano;
                escola_sel = escola;
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
    chart.ordinalColors(['DarkGray', 'darkorange', 'blue']);
    chart.render();


    let data_pyramide = transformDataPyramide(evasaoGeneroGrupo.all());
    pyramidChart("#chart4", data_pyramide);



    // EVASÃO POR ANOS CURSADOS
    lineChart.margins({ top: 40, right: 50, bottom: 40, left: 80 })
        .width(450)
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
        .ordinalColors(['blue'])
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
        });

    lineChart.xAxis().ticks(10);
    if (evadidosTempoDeCursoGroup.top(1)[0].value <= 10)
        lineChart.yAxis().ticks(evadidosTempoDeCursoGroup.top(1)[0].value);

    lineChart.xAxis().tickFormat(d3.format("d"));
    lineChart.yAxis().tickFormat(d3.format("d"));

    //dc.renderAll();

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
            d3.max(data, d => (d.Masculino)),
            d3.max(data, d => (d.Feminino)),
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
            .tickFormat(d3.format('d'));

        // REVERSE THE X-AXIS SCALE ON THE LEFT SIDE BY REVERSING THE RANGE
        var xAxisLeft = d3.axisBottom(xScale.copy().range([pointA, 0]))
            .ticks(5)
            .tickFormat(d3.format('d'));

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
            .attr('width', d => xScale((d.Masculino)))
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
            .text((d, i) => d.grupo + " - Masculino : " + d.Masculino)
            .style("font-size", "16px");

        rightBarGroup.selectAll('.bar.right')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar right')
            .attr("fill", "darkorange")
            .attr('x', 0)
            .attr('y', d => yScale(d.grupo))
            .attr('width', d => xScale((d.Feminino)))
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
            .text((d, i) => d.grupo + " - Feminino : " + d.Feminino)
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

});
