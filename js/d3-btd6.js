// Tower Data and TwoTc Data
d3.json("2tcdata.json").then(twoTCData => {
d3.json("towerData.json").then(towerData => {

// Links for the graph
const two_tc_links = twoTCData.filter(item => item.og == true)
.map(item => {
    let towers = [item.tower1, item.tower2]
    towers.sort()
    return{
    source: towers[0],
    target: towers[1]
}})

// Degree Count for the nodes of the graph + Connected towers
const degreeCount = two_tc_links.reduce((x, item) => {
  x[item.source] = (x[item.source] || {"count": 0, "connected" : new Set()})
  x[item.target] = (x[item.target] || {"count": 0, "connected" : new Set()})
  x[item.source]["count"] += 1;
  x[item.target]["count"] += 1;
  x[item.source]["connected"].add(item.target)
  x[item.target]["connected"].add(item.source)
  return x;
}, {});

// Tower Nodes for the graph
const towerNodes = towerData.map(item => ({
    id: item.entity,
    category: item.category,
    degreeCount: (degreeCount[item.entity] || {"count": 0})["count"],
    connected: (degreeCount[item.entity] || {"connected": new Set()})["connected"],
    image: `tower_images/${item.entity.replace(":","")}.png`
  }))
  .sort((a,b) => b.degreeCount - a.degreeCount) // sort by degree count 

const container = d3.select("#d3-btd6");

const renderChart= () => {
    const width = 2000
    const height = 1000
    const categories = ["Primary", "Military", "Magic", "Support", "Hero", "Paragon"]
    const categoryColors = ["skyblue", "lightgreen",    "plum", "orange", "gold", "indigo"]
    // Color Scale based on categories
    const color = d3.scaleOrdinal()
        .domain(categories)
        .range(categoryColors); 

    // Scale for node size based on degree
    const size = d3.scaleSqrt()
        .domain([0, d3.max(towerNodes, d => d.degreeCount)])
        .range([12.5,22])
        
    const towers = towerNodes.map(d => ({...d}));
    const edges = two_tc_links.map(d => ({...d}));

    // Define Forces
    const simulation = d3.forceSimulation(towers)
        .force("link", d3.forceLink(edges).id((d) => d.id).distance(250)) 
        .force("charge", d3.forceManyBody().strength(-80))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("collide",  d3.forceCollide((d) => d.r))

    // SVG Container
    container
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "max-width: 100%; height: auto;");

    const width_paddding = 300
    const height_padding = 40
    const legend_scale = 2.5
    // draw legend
    const legend = container
        .append('g')
        .attr('transform', `translate(${width/2 - width_paddding}, -${height/2 - height_padding}) scale(${legend_scale})`)
        .call(colorLegend); 

    // draw the info text
    const info_padding = 40 // padding between info elements
    const infoHeader= container
    .append('text')
    .attr('x', -width/2 +  40)
    .attr('y', -height/2 + height_padding)
    .attr('fill', 'black')
    .attr('font-family', 'Helvetica Neue, Arial')
    .attr('font-weight', 'bold')
    .attr('font-size', '30px')
    .style('user-select', 'none')
    .text('Selected Tower: ');

    const infoText= container
    .append('text')
    .attr('x', -width/2 +  40)
    .attr('y', -height/2 + height_padding + info_padding)
    .attr('fill', 'black')
    .attr('font-family', 'Helvetica Neue, Arial')
    .attr('font-weight', 'bold')
    .attr('font-size', '30px')
    .style('user-select', 'none')
    .text('None');

    const infoComboAmount= container
    .append('text')
    .attr('x', -width/2 +  40)
    .attr('y', -height/2 + height_padding + 2 * info_padding)
    .attr('fill', 'black')
    .attr('font-family', 'Helvetica Neue, Arial')
    .attr('font-weight', 'bold')
    .attr('font-size', '30px')
    .style('user-select', 'none')
    .text('0 Combos');

    // creates the infographic image
    const infoImage = container
        .append("image")
        .attr("xlink:href","") 
        .attr("width", 200)
        .attr("height", 200)
        .attr("x", -width/2 + 40)  
        .attr("y", -height/2 + height_padding + 2.5 * info_padding);

    // create lines for links
    const links = container.append("g")
        .selectAll("line")
        .data(edges)
        .join("line")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 1);

    // create nodes
    let selectedNode = null
    const nodes = container.append("g")
    .selectAll("g")
        .data(towers)
        .join("g")
        .attr("opacity", 1.0)
        .call(d3.drag()
                .clickDistance(10)
                .on("start", dragStarted)
                .on("drag", dragging)
                .on("end", dragEnded))
        .on("click", onClick)

    // adds circles
    nodes.append("circle")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .attr("r",d => size(d.degreeCount))
        .attr("fill", d => color(d.category))

    // adds the images to the circles
    nodes.append("image")
        .attr("xlink:href",d => d.image) 
        .attr("width", d => 2 * size(d.degreeCount))
        .attr("height", d => 2 * size(d.degreeCount))
        .attr("x", d => -size(d.degreeCount))  
        .attr("y", d => -size(d.degreeCount));
    
    // append tower tooltips
    nodes.append("title")
        .text(d => `${d.id} : ${d.degreeCount}`)

    // Force tick function
    simulation.on("tick", () => {
        links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y)
        nodes
            .attr("transform", d => `translate(${d.x},${d.y})`); 
        
    })

    // drag functions
    function dragStarted(e) {
        if (!e.active) simulation.alphaTarget(0.3).restart();
        e.subject.fx = e.subject.x
        e.subject.fy = e.subject.y
    }

    function dragging(e) {
        e.subject.fx = e.x
        e.subject.fy = e.y
    }

    function dragEnded(e) {
        if (!e.active) simulation.alphaTarget(0)
        e.subject.fx = null;
        e.subject.fy = null;
    }

    // onClick function to handle node color switching
    function onClick(_, d) {
        let isSelected = selectedNode === d.id

        // reset everything back

        d3.selectAll("circle")
        .transition()
        .attr("stroke", "#000")

        nodes
            .transition()
            .attr("opacity", 1.0)

        links        
            .transition()
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
        
        if (!isSelected){ // this node is now the "highlighted" one

            infoText.attr('fill', color(d.category)).text(`${d.id}`);
            infoComboAmount.attr('fill', color(d.category)).text(`${d.degreeCount} Combos`);
            infoImage.attr("xlink:href",d.image) 

            selectedNode = d.id
            d3.select(this)
            .select("circle")
            .transition()
            .attr("stroke", "red")

            // highlight connected links
            links
            .transition()
            .attr("stroke-opacity", 0.1)
            .attr("stroke", "#999")
            .filter(l => l.source.id === d.id || l.target.id === d.id)
            .attr("stroke", "red")
            .attr("stroke-opacity", 1.0)

            // highlight connected nodes
            nodes
            .transition()
            .attr("opacity", 0.3)
            .filter(node => towers[d.index]["connected"].has(node.id) || node.id === d.id)
            .attr("opacity", 1.0)
        }
        else { // node was already highlighted, now nothing is highlighted
            infoText.attr('fill', 'black').text(`None`)
            infoComboAmount.attr('fill', 'black').text(`0 Combos`);
            infoImage.attr("xlink:href","") 
            selectedNode = null
        }
    }

    // function to create the category legend
    function colorLegend(container) {
        const titlePadding = 14;  // padding between title and entries
        const entrySpacing = 16;  // padding between entries
        const entryRadius = 5;    // radius of legend marks
        const labelOffset = 4;   // horizontal offset of text labels
        const baselineOffset = 4; // text baseline offset 

        const title = container.append('text')
            .attr('x', 0)
            .attr('y', 0)
            .attr('fill', 'black')
            .attr('font-family', 'Helvetica Neue, Arial')
            .attr('font-weight', 'bold')
            .attr('font-size', '12px')
            .style('user-select', 'none')
            .text('Tower Category');
        
        const entries = container.selectAll('g')
            .data(categories)
            .join('g')
            .attr('transform', (d,i) => `translate(0, ${titlePadding + i * entrySpacing})`);

        const symbols = entries.append('circle')
            .attr('cx', entryRadius) 
            .attr('r', entryRadius)
            .attr('fill', (d,i) => categoryColors[i])
            .attr("stroke", "#000")

        const labels = entries.append('text')
            .attr('x', 2 * entryRadius + labelOffset) 
            .attr('y', baselineOffset) 
            .attr('fill', 'black')
            .attr('font-family', 'Helvetica Neue, Arial')
            .attr('font-size', '11px')
            .style('user-select', 'none') 
            .text((d,i) => categories[i]);
    }
};
renderChart();
})})