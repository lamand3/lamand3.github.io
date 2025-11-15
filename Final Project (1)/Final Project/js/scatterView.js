(function () {
    const CSV_PATH = "./data/gapminder_internet.csv";
    const svg = d3.select("#scatterVis");
    if (svg.empty()) return;

    const vb = svg.node().viewBox.baseVal || { width: 1100, height: 520, x: 0, y: 0 };
    const margin = { top: 24, right: 28, bottom: 56, left: 70 };
    const width = vb.width - margin.left - margin.right;
    const height = vb.height - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
    const countEl = document.getElementById("scatter-count");
    const capInput = document.getElementById("scatter-cap");

    function parseRow(d) {
        const name = (d.country || "").trim();
        const code = name ? name.slice(0, 3).toUpperCase() : "";
        const net = +d.internetuserate;
        const urb = +d.urbanrate;

        return code && isFinite(net) && isFinite(urb)
            ? { name, code, net, urb }
            : null;
    }

    const x = d3.scaleLinear().domain([0, 100]).range([0, width]).nice(); // Urban rate (%)
    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]).nice(); // Internet use (%)
    const r = d3.scaleSqrt().domain([0, 100]).range([3, 14]); // Bubble size by Internet use
    const c = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]); // Color by Internet use

    // === Axes ===
    const xAxis = g.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "x-axis");

    const yAxis = g.append("g").attr("class", "y-axis");

    const xLabel = g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 42)
        .attr("text-anchor", "middle")
        .style("font", "12px system-ui")
        .text("Urbanization rate (%)");

    const yLabel = g.append("text")
        .attr("x", -height / 2)
        .attr("y", -48)
        .attr("transform", "rotate(-90)")
        .attr("text-anchor", "middle")
        .style("font", "12px system-ui")
        .text("Internet use (%)");

    xAxis.call(d3.axisBottom(x).ticks(10).tickFormat(d => d + "%"));
    yAxis.call(d3.axisLeft(y).ticks(6).tickFormat(d => d + "%"));

    const tip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "fixed")
        .style("pointer-events", "none")
        .style("background", "rgba(0,0,0,.75)")
        .style("color", "#fff")
        .style("padding", "6px 8px")
        .style("border-radius", "6px")
        .style("font", "12px system-ui")
        .style("opacity", 0);

    const dotsG = g.append("g").attr("class", "dots");
    const brushG = g.append("g").attr("class", "brush");
    brushG.lower();

    let data = [];
    let selected = new Set();

    d3.csv(CSV_PATH, parseRow).then(rows => {
        data = rows.filter(Boolean);

        const cap = clampCap(+capInput.value);
        render(data.slice(0, cap));

        capInput.addEventListener("change", () => {
            const n = clampCap(+capInput.value);
            render(data.slice(0, n));
        });
    }).catch(err => console.error("scatter load error:", err));

    function clampCap(n) {
        if (!Number.isFinite(n)) n = 150;
        n = Math.max(20, Math.min(500, n | 0));
        capInput.value = n;
        return n;
    }

    function render(show) {
        if (countEl) countEl.textContent = `Showing ${show.length} countries`;
        selected.clear();

        const dots = dotsG.selectAll("circle").data(show, d => d.code);

        const enter = dots.enter().append("circle")
            .attr("cx", d => x(d.urb))
            .attr("cy", d => y(d.net))
            .attr("r", 0)
            .attr("fill", d => c(d.net))
            .attr("opacity", 0.9)
            .attr("stroke", "#1f3c88")
            .attr("stroke-width", 0.6)
            .on("pointerenter", (e, d) => {
                tip.style("opacity", 1)
                    .html(`<strong>${d.name}</strong><br/>Urban rate: ${d.urb.toFixed(1)}%<br/>Internet: ${d.net.toFixed(1)}%`);
                d3.select(e.currentTarget).attr("stroke-width", 1.2);
            })
            .on("pointermove", (e) => {
                tip.style("left", (e.clientX + 14) + "px").style("top", (e.clientY + 14) + "px");
            })
            .on("pointerleave", (e) => {
                tip.style("opacity", 0);
                d3.select(e.currentTarget).attr("stroke-width", 0.6);
            });

        enter.transition().duration(500).attr("r", d => r(d.net));

        dots.merge(enter)
            .transition().duration(500)
            .attr("cx", d => x(d.urb))
            .attr("cy", d => y(d.net))
            .attr("r", d => r(d.net))
            .attr("fill", d => c(d.net));

        dots.exit().transition().duration(300).attr("r", 0).remove();

        const brush = d3.brush()
            .extent([[0, 0], [width, height]])
            .on("start brush end", brushed);

        brushG.call(brush);
        brushG.on("dblclick", () => {
            brushG.call(brush.move, null);
            selected.clear();
            updateSelectionStyles();
            broadcastSelection();
        });

        function brushed({ selection }) {
            if (!selection) {
                selected.clear();
                updateSelectionStyles();
                broadcastSelection();
                return;
            }
            const [[x0, y0], [x1, y1]] = selection;
            selected.clear();
            for (const d of show) {
                const px = x(d.urb);
                const py = y(d.net);
                if (x0 <= px && px <= x1 && y0 <= py && py <= y1) selected.add(d.code);
            }
            updateSelectionStyles();
            broadcastSelection();
        }

        function updateSelectionStyles() {
            dotsG.selectAll("circle")
                .attr("opacity", d => selected.size === 0 || selected.has(d.code) ? 0.95 : 0.2)
                .attr("stroke-width", d => selected.has(d.code) ? 1.6 : 0.6);
        }

        function broadcastSelection() {
            const codes = Array.from(selected);
            window.dispatchEvent(new CustomEvent("scatterSelect", { detail: { codes } }));
        }
    }
})();
