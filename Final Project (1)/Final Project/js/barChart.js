(function () {
    const CSV_PATH = "./data/internet-use-sample.csv";

    d3.csv(CSV_PATH, d => ({
        country: d.LOCATION?.trim(),
        year: +d.TIME,
        value: +d.Value
    })).then(rows => {
        const data = rows.filter(d => d.country && Number.isFinite(d.year) && Number.isFinite(d.value));

        const years = Array.from(new Set(data.map(d => d.year))).sort((a, b) => d3.ascending(a, b));
        const defaultYear = years.at(-1);

        const wrap = d3.select("#bar-chart");

        const controls = wrap.append("div").attr("class", "control-row");
        controls.append("label").attr("for", "bar-year-select").text("Year: ");
        const select = controls.append("select").attr("id", "bar-year-select");

        select.selectAll("option")
            .data(years)
            .enter()
            .append("option")
            .attr("value", d => d)
            .property("selected", d => d === defaultYear)
            .text(d => d);

        const margin = { top: 10, right: 24, bottom: 36, left: 140 };
        const width = wrap.node().getBoundingClientRect().width - 32;
        const height = 380;
        const innerW = Math.max(340, width - margin.left - margin.right);
        const innerH = height - margin.top - margin.bottom;

        const svg = wrap.append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`);

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().range([0, innerW]);
        const y = d3.scaleBand().range([0, innerH]).padding(0.12);

        const xAxisG = g.append("g").attr("transform", `translate(0,${innerH})`).attr("class", "x-axis");
        const yAxisG = g.append("g").attr("class", "y-axis");
        const barsG = g.append("g").attr("class", "bars");
        const labelsG = g.append("g").attr("class", "labels");

        function update(year) {
            const lbl = document.getElementById("bar-year-label");
            if (lbl) lbl.textContent = year;

            const filtered = data.filter(d => d.year === +year);
            const top5 = filtered
                .sort((a, b) => d3.descending(a.value, b.value))
                .slice(0, 5);

            x.domain([0, d3.max(top5, d => d.value) || 100]);
            y.domain(top5.map(d => d.country));

            const bars = barsG.selectAll("rect").data(top5, d => d.country);

            bars.enter()
                .append("rect")
                .attr("x", 0)
                .attr("y", d => y(d.country))
                .attr("height", y.bandwidth())
                .attr("width", 0)
                .attr("fill", "#7aa6ff")
                .merge(bars)
                .transition()
                .duration(600)
                .attr("y", d => y(d.country))
                .attr("height", y.bandwidth())
                .attr("width", d => x(d.value));

            bars.exit()
                .transition()
                .duration(300)
                .attr("width", 0)
                .remove();

            const vals = labelsG.selectAll("text.value").data(top5, d => d.country);

            vals.enter()
                .append("text")
                .attr("class", "value")
                .attr("x", 0)
                .attr("y", d => y(d.country) + y.bandwidth() / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "start")
                .style("font", "12px system-ui, sans-serif")
                .merge(vals)
                .transition()
                .duration(600)
                .attr("x", d => x(d.value) + 6)
                .attr("y", d => y(d.country) + y.bandwidth() / 2)
                .text(d => d3.format(".1f")(d.value) + "%");

            vals.exit().remove();

            xAxisG.transition().duration(600).call(d3.axisBottom(x).ticks(5).tickFormat(d => d + "%"));
            yAxisG.transition().duration(600).call(d3.axisLeft(y));
        }

        update(defaultYear);

        select.on("change", e => update(+e.target.value));
    }).catch(err => {
        console.error("Bar chart failed to load CSV:", err);
    });
})();
