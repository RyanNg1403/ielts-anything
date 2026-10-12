// Invented Task 1 figures, one per kind plus a mixed task, for tests and the figure preview page.
import type { Task1 } from "./writing.ts";

export const SAMPLE_TASK1 = {
  line: {
    intro: "The graph below shows the percentage of households with a home internet connection in four countries from 1995 to 2025.",
    figures: [
      {
        kind: "line",
        title: "Households with home internet",
        xLabel: "Year",
        points: ["1995", "2000", "2005", "2010", "2015", "2020", "2025"],
        yLabel: "Percentage (%) of households",
        series: [
          { name: "Norway", values: [8, 41, 64, 87, 93, 97, 98] },
          { name: "Chile", values: [2, 9, 22, 41, 62, 79, 86] },
          { name: "Vietnam", values: [0, 2, 8, 19, 38, 61, 74] },
          { name: "Kenya", values: [0, 1, 3, 9, 17, 29, 41] },
        ],
      },
    ],
  },
  bar: {
    intro: "The bar chart below shows the average number of hours per week that men and women in one country spent on five unpaid activities in 2024.",
    figures: [
      {
        kind: "bar",
        title: "Weekly hours spent on unpaid activities, 2024",
        orientation: "vertical",
        categories: ["Cooking", "Cleaning", "Childcare", "Shopping", "Gardening"],
        categoryLabel: "",
        valueLabel: "Hours per week",
        series: [
          { name: "Men", values: [3.5, 2.8, 4.1, 2.2, 1.9] },
          { name: "Women", values: [6.2, 5.9, 7.4, 3.1, 1.4] },
        ],
      },
    ],
  },
  pie: {
    intro: "The charts below show how a city's household waste was disposed of in 2005, 2015 and 2025.",
    figures: [
      {
        kind: "pie",
        title: "Household waste by method of disposal",
        pies: [
          { label: "2005", slices: [{ name: "Landfill", percent: 68 }, { name: "Recycling", percent: 14 }, { name: "Incineration", percent: 12 }, { name: "Composting", percent: 6 }] },
          { label: "2015", slices: [{ name: "Landfill", percent: 44 }, { name: "Recycling", percent: 29 }, { name: "Incineration", percent: 17 }, { name: "Composting", percent: 10 }] },
          { label: "2025", slices: [{ name: "Landfill", percent: 21 }, { name: "Recycling", percent: 43 }, { name: "Incineration", percent: 19 }, { name: "Composting", percent: 17 }] },
        ],
      },
    ],
  },
  table: {
    intro: "The table below gives information about visitors to three museums in one city in 2015 and 2025.",
    figures: [
      {
        kind: "table",
        title: "Museum visitors, 2015 and 2025",
        rowHeader: "Museum",
        columns: ["Visitors 2015 (thousands)", "Visitors 2025 (thousands)", "Under 18 (%) 2025", "Entry fee 2025"],
        rows: [
          { label: "Science Museum", cells: ["420", "610", "38", "Free"] },
          { label: "Art Gallery", cells: ["350", "330", "12", "£8"] },
          { label: "History Museum", cells: ["280", "395", "24", "£5"] },
          { label: "Maritime Museum", cells: ["150", "120", "19", "£6"] },
        ],
      },
    ],
  },
  process: {
    intro: "The diagram below shows how used glass bottles are recycled.",
    figures: [
      {
        kind: "process",
        title: "How glass bottles are recycled",
        numbered: true,
        stages: [
          { id: "s1", label: "Collection from bottle banks" },
          { id: "s2", label: "Transport to recycling plant" },
          { id: "s3", label: "Sorting by colour" },
          { id: "s4", label: "Crushing into cullet" },
          { id: "s5", label: "Melting at 1,500°C" },
          { id: "s6", label: "Moulding into new bottles" },
          { id: "s7", label: "Filling and labelling" },
          { id: "s8", label: "Sale in shops" },
        ],
        arrows: [
          { from: "s1", to: "s2", label: "" },
          { from: "s2", to: "s3", label: "" },
          { from: "s3", to: "s4", label: "Washing" },
          { from: "s4", to: "s5", label: "" },
          { from: "s5", to: "s6", label: "" },
          { from: "s6", to: "s7", label: "" },
          { from: "s7", to: "s8", label: "" },
          { from: "s8", to: "s1", label: "" },
        ],
      },
    ],
  },
  map: {
    intro: "The plans below show a seaside village in 1990 and how it looks today.",
    figures: [
      {
        kind: "map",
        title: "Seabrook village",
        compass: true,
        states: [
          {
            label: "Seabrook (1990)",
            features: [
              { kind: "water", label: "Sea", box: [70, 0, 30, 70], points: [] },
              { kind: "road", label: "Main road", box: [], points: [[4, 0], [4, 70]] },
              { kind: "road", label: "Coast road", box: [], points: [[4, 40], [36, 40], [64, 34]] },
              { kind: "building", label: "Post office", box: [10, 6, 14, 9], points: [] },
              { kind: "building", label: "Shops", box: [28, 6, 16, 9], points: [] },
              { kind: "area", label: "Farmland", box: [10, 46, 40, 20], points: [] },
              { kind: "trees", label: "Woods", box: [10, 20, 24, 14], points: [] },
              { kind: "building", label: "Fish market", box: [52, 14, 14, 10], points: [] },
              { kind: "area", label: "Beach", box: [56, 44, 12, 22], points: [] },
              { kind: "path", label: "Footpath", box: [], points: [[34, 27], [52, 27]] },
            ],
          },
          {
            label: "Seabrook (today)",
            features: [
              { kind: "water", label: "Sea", box: [70, 0, 30, 70], points: [] },
              { kind: "road", label: "Main road", box: [], points: [[4, 0], [4, 70]] },
              { kind: "road", label: "Coast road", box: [], points: [[4, 40], [36, 40], [64, 34]] },
              { kind: "building", label: "Post office", box: [10, 6, 14, 9], points: [] },
              { kind: "building", label: "Shops", box: [28, 6, 16, 9], points: [] },
              { kind: "building", label: "Housing", box: [10, 46, 22, 20], points: [] },
              { kind: "area", label: "Car park", box: [36, 48, 14, 16], points: [] },
              { kind: "area", label: "Playground", box: [10, 20, 12, 14], points: [] },
              { kind: "trees", label: "Park", box: [24, 20, 12, 14], points: [] },
              { kind: "building", label: "Hotel", box: [52, 14, 14, 10], points: [] },
              { kind: "area", label: "Beach", box: [56, 44, 12, 22], points: [] },
              { kind: "path", label: "Cycle path", box: [], points: [[36, 27], [52, 27]] },
            ],
          },
        ],
      },
    ],
  },
  mixed: {
    intro: "The chart and table below give information about the energy a country produced from renewable sources between 2010 and 2025.",
    figures: [
      {
        kind: "bar",
        title: "Renewable electricity produced (terawatt hours)",
        orientation: "horizontal",
        categories: ["Wind", "Solar", "Hydro", "Biomass"],
        categoryLabel: "",
        valueLabel: "Terawatt hours (TWh)",
        series: [
          { name: "2010", values: [12, 1, 34, 6] },
          { name: "2025", values: [58, 27, 36, 11] },
        ],
      },
      {
        kind: "table",
        title: "Share of total electricity from renewables",
        rowHeader: "Year",
        columns: ["Share (%)", "Change since 2010"],
        rows: [
          { label: "2010", cells: ["11", "-"] },
          { label: "2015", cells: ["19", "+8 points"] },
          { label: "2020", cells: ["31", "+20 points"] },
          { label: "2025", cells: ["42", "+31 points"] },
        ],
      },
    ],
  },
} satisfies Record<string, Task1>;
