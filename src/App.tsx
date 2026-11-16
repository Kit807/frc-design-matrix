import { useState, useCallback } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Criterion {
  id: string;
  name: string;
  weight: number;
}

interface Concept {
  id: string;
  name: string;
}

interface Scores {
  [conceptId: string]: {
    [criterionId: string]: number;
  };
}

const DEFAULT_CRITERIA: Criterion[] = [
  { id: "c1", name: "Speed", weight: 8 },
  { id: "c2", name: "Maneuverability", weight: 7 },
  { id: "c3", name: "Reliability", weight: 9 },
  { id: "c4", name: "Complexity", weight: 5 },
  { id: "c5", name: "Cost", weight: 6 },
  { id: "c6", name: "Scoring Potential", weight: 10 },
  { id: "c7", name: "Defense", weight: 6 },
  { id: "c8", name: "Climbing", weight: 8 },
];

const DEFAULT_CONCEPTS: Concept[] = [
  { id: "d1", name: "Swerve Drive" },
  { id: "d2", name: "Tank Drive" },
  { id: "d3", name: "Mecanum Drive" },
];

const DEFAULT_SCORES: Scores = {
  d1: { c1: 9, c2: 10, c3: 7, c4: 4, c5: 5, c6: 8, c7: 7, c8: 8 },
  d2: { c1: 7, c2: 5, c3: 9, c4: 8, c5: 9, c6: 7, c7: 8, c8: 6 },
  d3: { c1: 8, c2: 9, c3: 6, c4: 6, c5: 6, c6: 6, c7: 5, c8: 5 },
};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function App() {
  const [criteria, setCriteria] = useState<Criterion[]>(DEFAULT_CRITERIA);
  const [concepts, setConcepts] = useState<Concept[]>(DEFAULT_CONCEPTS);
  const [scores, setScores] = useState<Scores>(DEFAULT_SCORES);

  const getWeightedTotal = useCallback(
    (conceptId: string) => {
      return criteria.reduce((total, c) => {
        return total + (scores[conceptId]?.[c.id] || 0) * c.weight;
      }, 0);
    },
    [criteria, scores]
  );

  const getMaxPossible = useCallback(() => {
    return criteria.reduce((t, c) => t + 10 * c.weight, 0);
  }, [criteria]);

  const getWinner = useCallback(() => {
    let max = -1;
    let id = "";
    concepts.forEach((c) => {
      const t = getWeightedTotal(c.id);
      if (t > max) { max = t; id = c.id; }
    });
    return id;
  }, [concepts, getWeightedTotal]);

  const addCriterion = () => {
    const id = generateId();
    setCriteria([...criteria, { id, name: "New", weight: 5 }]);
    const ns = { ...scores };
    Object.keys(ns).forEach((cid) => { ns[cid] = { ...ns[cid], [id]: 5 }; });
    setScores(ns);
  };

  const removeCriterion = (id: string) => {
    setCriteria(criteria.filter((c) => c.id !== id));
    const ns = { ...scores };
    Object.keys(ns).forEach((cid) => { delete ns[cid][id]; });
    setScores(ns);
  };

  const addConcept = () => {
    const id = generateId();
    setConcepts([...concepts, { id, name: "New Design" }]);
    const ns = { ...scores };
    ns[id] = {};
    criteria.forEach((c) => { ns[id][c.id] = 5; });
    setScores(ns);
  };

  const removeConcept = (id: string) => {
    setConcepts(concepts.filter((c) => c.id !== id));
    const ns = { ...scores };
    delete ns[id];
    setScores(ns);
  };

  const updateScore = (conceptId: string, criterionId: string, val: string) => {
    const n = Math.max(1, Math.min(10, parseInt(val) || 1));
    setScores({ ...scores, [conceptId]: { ...scores[conceptId], [criterionId]: n } });
  };

  const updateWeight = (id: string, val: string) => {
    const n = Math.max(1, Math.min(10, parseInt(val) || 1));
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, weight: n } : c)));
  };

  const updateCriterionName = (id: string, name: string) => {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const updateConceptName = (id: string, name: string) => {
    setConcepts(concepts.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const winner = concepts.length > 0 ? getWinner() : "";
  const maxPossible = getMaxPossible();

  const exportPDF = () => {
    const doc = new jsPDF({
      orientation: concepts.length > 4 ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("FRC Engineering Design Matrix", 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("FIRST Robotics Competition - Decision Tool", 14, 24);

    // Build table data
    const head = [
      ["Criterion", "Weight", ...concepts.map((c) => c.name)],
    ];

    const body = criteria.map((cr) => [
      cr.name,
      String(cr.weight),
      ...concepts.map((co) => String(scores[co.id]?.[cr.id] || 0)),
    ]);

    // Totals row
    const totals = [
      "WEIGHTED TOTAL",
      "",
      ...concepts.map((co) => String(getWeightedTotal(co.id))),
    ];

    // Determine winner
    const winnerName =
      concepts.length > 1
        ? concepts.find((c) => c.id === winner)?.name
        : "";

    autoTable(doc, {
      head,
      body: [...body, totals],
      startY: 30,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: "bold" },
        1: { cellWidth: 18, halign: "center" },
      },
      bodyStyles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [248, 248, 248],
      },
      didParseCell: (data) => {
        // Bold the totals row
        if (data.row.index === body.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [240, 240, 240];
        }
        // Center-align score columns (index >= 2)
        if (data.column.index >= 2) {
          data.cell.styles.halign = "center";
        }
      },
    });

    // Add winner note
    if (winnerName) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Winner: ${winnerName}`, 14, finalY + 12);
    }

    doc.save("FRC-Design-Matrix.pdf");
  };

  const shareMatrix = async () => {
    const lines: string[] = [];
    lines.push("FRC Engineering Design Matrix");
    lines.push("============================");
    lines.push("");

    // Build text table
    const headers = ["Criterion", "Wt", ...concepts.map((c) => c.name)];
    const rows = criteria.map((cr) => [
      cr.name,
      String(cr.weight),
      ...concepts.map((co) => String(scores[co.id]?.[cr.id] || 0)),
    ]);
    const totals = [
      "WEIGHTED TOTAL",
      "",
      ...concepts.map((co) => String(getWeightedTotal(co.id))),
    ];

    const allRows = [headers, ...rows, totals];
    const colWidths = headers.map((_, i) =>
      Math.max(...allRows.map((r) => (r[i] || "").length))
    );

    const formatRow = (row: string[]) =>
      row.map((cell, i) => cell.padEnd(colWidths[i])).join("  |  ");

    lines.push(formatRow(headers));
    lines.push(colWidths.map((w) => "-".repeat(w)).join("-+-"));
    rows.forEach((r) => lines.push(formatRow(r)));
    lines.push(colWidths.map((w) => "-".repeat(w)).join("-+-"));
    lines.push(formatRow(totals));

    // Add winner
    if (concepts.length > 1) {
      const winnerName = concepts.find((c) => c.id === winner)?.name;
      lines.push("");
      lines.push(`★ WINNER: ${winnerName}`);
    }

    const text = lines.join("\n");

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({ title: "FRC Design Matrix", text });
        return;
      } catch {
        // User cancelled or error — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      alert("Matrix copied to clipboard!");
    } catch {
      // Final fallback: open a textarea
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<pre style="font-family:monospace;white-space:pre">${text}</pre>`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b-2 border-black px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">FRC Engineering Design Matrix</h1>
        <p className="text-sm text-gray-600 mt-1">FIRST Robotics Competition — Decision Tool</p>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button onClick={addConcept} className="border-2 border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white transition-colors">
            + Add Design
          </button>
          <button onClick={addCriterion} className="border-2 border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white transition-colors">
            + Add Criterion
          </button>
          <div className="flex-1" />
          <button onClick={exportPDF} className="border-2 border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white transition-colors">
            Save as PDF
          </button>
          <button onClick={shareMatrix} className="border-2 border-black px-4 py-2 text-sm font-semibold hover:bg-black hover:text-white transition-colors">
            Share
          </button>
        </div>

        {/* Matrix */}
        <div className="border-2 border-black overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left p-3 border-r border-black bg-gray-100 min-w-[180px] text-sm font-bold">
                  CRITERIA
                </th>
                <th className="text-center p-3 border-r border-black bg-gray-100 w-[70px] text-sm font-bold">
                  WT
                </th>
                {concepts.map((concept) => (
                  <th key={concept.id} className="p-2 border-r border-black bg-gray-100 min-w-[130px] text-center">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="text"
                        value={concept.name}
                        onChange={(e) => updateConceptName(concept.id, e.target.value)}
                        className="text-center font-bold text-sm bg-transparent border-b border-transparent hover:border-gray-400 focus:border-black focus:outline-none w-full"
                      />
                      <button
                        onClick={() => removeConcept(concept.id)}
                        className="text-xs text-gray-400 hover:text-black"
                      >
                        remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map((criterion) => (
                <tr key={criterion.id} className="border-b border-gray-300">
                  <td className="p-3 border-r border-black">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={criterion.name}
                        onChange={(e) => updateCriterionName(criterion.id, e.target.value)}
                        className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-400 focus:border-black focus:outline-none flex-1"
                      />
                      <button
                        onClick={() => removeCriterion(criterion.id)}
                        className="text-xs text-gray-400 hover:text-black flex-shrink-0"
                      >
                        remove
                      </button>
                    </div>
                  </td>
                  <td className="p-2 border-r border-black text-center">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={criterion.weight}
                      onChange={(e) => updateWeight(criterion.id, e.target.value)}
                      className="w-12 text-center text-sm font-bold bg-transparent border border-gray-300 focus:border-black focus:outline-none py-1"
                    />
                  </td>
                  {concepts.map((concept) => {
                    const score = scores[concept.id]?.[criterion.id] || 0;
                    return (
                      <td key={concept.id} className="p-2 border-r border-gray-300 text-center">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={score}
                          onChange={(e) => updateScore(concept.id, criterion.id, e.target.value)}
                          className="w-12 text-center text-sm font-semibold bg-transparent border border-gray-300 focus:border-black focus:outline-none py-1"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          = {score * criterion.weight}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Totals */}
              <tr className="border-t-2 border-black bg-gray-50">
                <td className="p-3 border-r border-black font-bold text-sm">
                  WEIGHTED TOTAL
                </td>
                <td className="p-2 border-r border-black text-center text-xs text-gray-500">
                  /{maxPossible}
                </td>
                {concepts.map((concept) => {
                  const total = getWeightedTotal(concept.id);
                  const pct = maxPossible > 0 ? ((total / maxPossible) * 100).toFixed(1) : "0";
                  const isWinner = concept.id === winner;
                  return (
                    <td key={concept.id} className="p-3 border-r border-gray-300 text-center">
                      <div className={`text-xl font-bold ${isWinner ? "underline underline-offset-4" : ""}`}>
                        {total}
                      </div>
                      <div className="text-xs text-gray-500">{pct}%</div>
                      {isWinner && concepts.length > 1 && (
                        <div className="text-xs font-bold mt-1">★ WINNER</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 border border-gray-300 p-4 text-sm">
          <p className="font-bold mb-2">How it works</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li><strong>Weight (WT):</strong> Rate importance 1–10. Higher = more important.</li>
            <li><strong>Score:</strong> Rate each design 1–10 on each criterion.</li>
            <li><strong>Weighted Total:</strong> Sum of (score × weight). Highest wins.</li>
          </ul>
        </div>

        <footer className="mt-8 pb-6 text-center text-xs text-gray-400">
          FRC Engineering Design Matrix
        </footer>
      </main>
    </div>
  );
}
