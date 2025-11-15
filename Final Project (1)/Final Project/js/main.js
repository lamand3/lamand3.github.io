// ===============================
// main.js
// ===============================

const INTERNET_CSV_PATH = "./data/internet-use-sample.csv";
const FUNFACTS_CSV_PATH = "./data/gapminder_internet.csv";

window.addEventListener("DOMContentLoaded", () => {
    wireClickToReveal();
    initFunFacts();
});


function wireClickToReveal() {
    const btn  = document.getElementById("clickText");
    const pane = document.getElementById("graphPane");
    if (!btn || !pane) return;

    let built = false;

    btn.addEventListener("click", async () => {
        pane.hidden = false;
        requestAnimationFrame(() => pane.classList.add("visible"));
        if (!built) {
            built = true;
            await makeLineChartFromCSV();
        }
    });
}

async function makeLineChartFromCSV() {
    const svg = d3.select("#chart1");
    if (svg.empty()) return;

    svg.selectAll("*").remove();

    let rows = [];
    try {
        rows = await d3.csv(INTERNET_CSV_PATH, d => ({
            code: (d.LOCATION || "").trim(),
            year: +d.TIME,
            val: +d.Value
        }));
    } catch (e) {
        console.warn("Failed to load internet-use-sample.csv:", e);
        return;
    }

    const picks = ["USA", "GBR", "DEU", "JPN", "MEX"];
    const data  = rows.filter(r => picks.includes(r.code) && isFinite(r.year) && isFinite(r.val));

    const series = Array.from(
        d3.group(data, d => d.code),
        ([key, values]) => ({ key, values: values.sort((a,b)=>d3.ascending(a.year,b.year)) })
    );

    const vb = svg.node().viewBox.baseVal || { width: 900, height: 400, x:0, y:0 };
    const margin = { top: 28, right: 90, bottom: 42, left: 60 };
    const width  = vb.width  - margin.left - margin.right;
    const height = vb.height - margin.top  - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 100]).nice()
        .range([height, 0]);

    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    g.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d => d + "%"));

    g.append("text")
        .attr("x", width/2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .style("font", "600 16px system-ui")
        .text("Percent Internet Usage Over Time");

    const color = d3.scaleOrdinal()
        .domain(picks)
        .range(["#4e79a7","#f28e2c","#59a14f","#e15759","#9c755f"]);

    const line = d3.line()
        .defined(d => Number.isFinite(d.val))
        .x(d => x(d.year))
        .y(d => y(d.val));

    g.selectAll(".series")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "series")
        .attr("fill", "none")
        .attr("stroke", d => color(d.key))
        .attr("stroke-width", 2)
        .attr("d", d => line(d.values));

    const legend = g.append("g").attr("transform", `translate(${width - 80}, 6)`);
    picks.forEach((c, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i*18})`);
        row.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", color(c));
        row.append("text").attr("x", 18).attr("y", 10).style("font","12px system-ui").text(c);
    });
}


async function initFunFacts() {
    const ffList = d3.select("#ff-list");
    const svg = d3.select("#gdpNetChart");
    if (ffList.empty() || svg.empty()) return;

    let rows;
    try {
        rows = await d3.csv(FUNFACTS_CSV_PATH, d => {
            const name = (d.country || "").trim();
            const code = name ? name.slice(0,3).toUpperCase() : "";
            const net  = +d.internetuserate;     // %
            const urb  = +d.urbanrate;           // %
            const gdp  = +d.incomeperperson;     // USD
            return (code && Number.isFinite(net) && Number.isFinite(urb) && Number.isFinite(gdp))
                ? { name, code, net, urb, gdp }
                : null;
        });
    } catch (e) {
        console.error("Could not load gapminder_internet.csv:", e);
        return;
    }

    const data = rows.filter(Boolean);

    const FIXED_CODES = ["LIE","BER","LUX","NOR","JAP","MAL","GUI","LIB","ERI","BUR"];
    const sample = FIXED_CODES
        .map(code => data.find(d => d.code === code))
        .filter(Boolean);

    const vb = svg.node().viewBox.baseVal || { width: 1100, height: 520, x:0, y:0 };
    const m = { top: 40, right: 80, bottom: 100, left: 70 };
    const width  = vb.width  - m.left - m.right;
    const height = vb.height - m.top  - m.bottom;

    const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);

    const x = d3.scaleBand().padding(0.35).range([0, width]);
    const xInner = d3.scaleBand().domain(["gdp","net"]).padding(0.18);
    const yLeft  = d3.scaleLinear().range([height, 0]).nice(); // Internet %
    const yRight = d3.scaleLinear().range([height, 0]).nice(); // GDP USD

    const color = d3.scaleOrdinal().domain(["gdp","net"]).range(["#4e79a7","#f28e2c"]);

    const xAxisG  = g.append("g").attr("transform", `translate(0,${height})`);
    const yLeftG  = g.append("g");
    const yRightG = g.append("g").attr("transform", `translate(${width},0)`);

    g.append("text")
        .attr("x", width/2).attr("y", -14)
        .attr("text-anchor","middle").style("font","600 18px system-ui")
        .text("GDP per Capita vs Internet Usage (Selected Countries)");

    const legend = g.append("g").attr("transform","translate(0,-2)");
    [["gdp","GDP per capita (USD)"],["net","Internet (%)"]].forEach((d,i)=>{
        const row = legend.append("g").attr("transform",`translate(${i*210},0)`);
        row.append("rect").attr("width",14).attr("height",14).attr("rx",3).attr("fill",color(d[0]));
        row.append("text").attr("x",20).attr("y",11).style("font","12px system-ui").text(d[1]);
    });

    const groupsG = g.append("g").attr("class","country-groups");
    const namesG  = g.append("g").attr("class","country-fullnames");

    const active = new Map();
    let selected = [];

    const funFact = d => `~${d.net.toFixed(1)}% online`;

    const chips = ffList.selectAll(".ff-chip")
        .data(sample, d => d.code)
        .enter()
        .append("button")
        .attr("type","button")
        .attr("class","ff-chip")
        .each(function(d){
            this.dataset.active = "false";
            this.textContent = funFact(d);
        })
        .on("click", function(e, d){
            const isActive = this.dataset.active === "true";
            if (isActive) {
                this.dataset.active = "false";
                this.classList.remove("active");
                this.textContent = funFact(d);
                active.set(d.code, false);
                selected = selected.filter(x => x.code !== d.code);
            } else {
                this.dataset.active = "true";
                this.classList.add("active");
                this.textContent = d.name;
                active.set(d.code, true);
                if (!selected.find(x => x.code === d.code)) {
                    selected = [...selected, d].sort(
                        (a,b)=> FIXED_CODES.indexOf(a.code) - FIXED_CODES.indexOf(b.code)
                    );
                }
            }
            update();
        });

    function update() {
        const maxGDP = d3.max(selected, d => d.gdp) || 1;
        yRight.domain([0, maxGDP * 1.1]).nice();
        yLeft.domain([0, 100]).nice();

        yLeftG.call(d3.axisLeft(yLeft).ticks(6).tickFormat(d => d + "%"));
        yRightG.call(d3.axisRight(yRight).ticks(6).tickFormat(d => "$" + d3.format(",")(d)));

        x.domain(selected.map(d => d.code));
        xInner.range([0, Math.max(0, x.bandwidth())]);

        xAxisG.call(d3.axisBottom(x).tickSizeOuter(0).tickFormat(d => d));
        xAxisG.selectAll("text").style("font","12px system-ui");

        const groups = groupsG.selectAll(".country").data(selected, d => d.code);
        groups.exit().remove();

        const gEnter = groups.enter().append("g")
            .attr("class","country")
            .attr("transform", d => `translate(${x(d.code)},0)`);

        gEnter.merge(groups)
            .transition().duration(400)
            .attr("transform", d => `translate(${x(d.code)},0)`);

        const bars = groupsG.selectAll(".country").selectAll("rect")
            .data(d => ([
                { k:"gdp", val:d.gdp, code:d.code },
                { k:"net", val:d.net, code:d.code }
            ]), d => d.k);

        const bEnter = bars.enter().append("rect")
            .attr("x", d => xInner(d.k))
            .attr("y", height)
            .attr("width", xInner.bandwidth())
            .attr("height", 0)
            .attr("rx", 4)
            .attr("fill", d => color(d.k))
            .attr("opacity", 0.9);

        bEnter.transition().duration(550)
            .attr("y", d => d.k === "gdp" ? yRight(d.val) : yLeft(d.val))
            .attr("height", d => height - (d.k === "gdp" ? yRight(d.val) : yLeft(d.val)));

        bars.merge(bEnter).transition().duration(450)
            .attr("x", d => xInner(d.k))
            .attr("y", d => d.k === "gdp" ? yRight(d.val) : yLeft(d.val))
            .attr("width", xInner.bandwidth())
            .attr("height", d => height - (d.k === "gdp" ? yRight(d.val) : yLeft(d.val)));

        bars.exit().transition().duration(250).attr("y", height).attr("height", 0).remove();

        const valFmt = d3.format(",.0f");
        const valLabels = groupsG.selectAll(".country").selectAll("text.barval")
            .data(d => ([
                { k:"gdp", val:d.gdp, code:d.code },
                { k:"net", val:d.net, code:d.code }
            ]), d => d.k);

        const vlEnter = valLabels.enter().append("text")
            .attr("class","barval")
            .attr("text-anchor","middle")
            .style("font","11px system-ui")
            .style("fill","#222")
            .attr("x", d => xInner(d.k) + xInner.bandwidth()/2)
            .attr("y", height - 4)
            .attr("opacity", 0);

        vlEnter.merge(valLabels).transition().duration(450)
            .attr("x", d => xInner(d.k) + xInner.bandwidth()/2)
            .attr("y", d => (d.k === "gdp" ? yRight(d.val) : yLeft(d.val)) - 6)
            .text(d => d.k === "gdp" ? `$${valFmt(d.val)}` : `${d.val.toFixed(1)}%`)
            .attr("opacity", 1);

        valLabels.exit().remove();

        const names = namesG.selectAll("text").data(selected, d => d.code);
        names.exit().transition().duration(200).attr("opacity",0).remove();

        const nEnter = names.enter().append("text")
            .attr("text-anchor","middle")
            .style("font","11px system-ui")
            .style("fill","#666")
            .attr("x", d => (x(d.code) ?? 0) + x.bandwidth()/2)
            .attr("y", height + 28)
            .attr("opacity", 0)
            .text(d => d.name);

        nEnter.merge(names).transition().duration(300)
            .attr("x", d => (x(d.code) ?? 0) + x.bandwidth()/2)
            .attr("y", height + 28)
            .text(d => d.name)
            .attr("opacity", 1);
    }
}
