import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine 
} from 'recharts';
import { 
  UploadCloud, Users, TrendingUp, AlertCircle, 
  Search, BookOpen, BrainCircuit, Activity 
} from 'lucide-react';

// --- Components ---

// 1. Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-4">
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

// 2. File Upload Component
const FileUploader = ({ onDataLoaded, loading }) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Filter out rows that don't have IDs (empty lines or malformed rows)
          const validData = results.data.filter(row => row.StudentID !== null && row.StudentID !== undefined);
          onDataLoaded(validData);
        },
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
      <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
      <h3 className="text-lg font-semibold text-slate-700">Upload Student Data (CSV)</h3>
      <p className="text-sm text-slate-500 mb-6">Drag and drop or click to select</p>
      <label className={`cursor-pointer px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {loading ? 'Processing...' : 'Select File'}
        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={loading} />
      </label>
    </div>
  );
};

// 3. Main Dashboard
export default function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [error, setError] = useState(null);

  // Function to call the FastAPI Backend
  const processData = async (rawJsonData) => {
    setLoading(true);
    setError(null);
    try {
      // Sending parsed CSV data as JSON to the backend
      const response = await fetch('http://localhost:8000/simulate_batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawJsonData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to connect to backend');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || "Could not connect to the backend. Ensure FastAPI is running on port 8000.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    if (!results) return null;
    const total = results.length;
    // Note: Backend maps 'FinalGrade' to 'ActualGrade'
    const avgGrade = results.reduce((acc, curr) => acc + curr.ActualGrade, 0) / total;
    
    // Priority Logic: Grade < 10 (Failing) AND Complexity < 0.6 (Easier to fix)
    const priority = results.filter(r => r.ActualGrade < 10 && r.ComplexityScore < 0.6).length;
    const highPerformers = results.filter(r => r.ActualGrade >= 15).length;

    return { total, avgGrade: avgGrade.toFixed(1), priority, highPerformers };
  }, [results]);

  // Priority Sorting for list
  const priorityList = useMemo(() => {
    if (!results) return [];
    // Sort by: Lowest Grade first, then Lowest Complexity (easiest wins first)
    return [...results]
      .sort((a, b) => a.ActualGrade - b.ActualGrade || a.ComplexityScore - b.ComplexityScore);
  }, [results]);

  // Chart Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl text-xs z-50">
          <p className="font-bold text-sm mb-1">{data.FirstName} {data.FamilyName}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-400">Current Grade:</span>
            <span className="font-mono text-yellow-400">{data.ActualGrade}</span>
            <span className="text-slate-400">Potential:</span>
            <span className="font-mono text-green-400">{data.PotentialGrade}</span>
            <span className="text-slate-400">Complexity:</span>
            <span className="font-mono">{data.ComplexityScore.toFixed(2)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BrainCircuit className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Ministério da Educação <span className="text-slate-400 font-normal">| Priority Engine</span>
            </h1>
          </div>
          {results && (
            <button 
              onClick={() => { setResults(null); setSelectedStudent(null); }}
              className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition"
            >
              Upload New Dataset
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* State: No Data */}
        {!results && (
          <div className="max-w-2xl mx-auto mt-10">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">Student Prioritization Tool</h2>
              <p className="text-slate-500">Upload the student CSV file to calculate improvement potential and intervention complexity.</p>
            </div>
            <FileUploader onDataLoaded={processData} loading={loading} />
            {error && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* State: Results Dashboard */}
        {results && stats && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Students" value={stats.total} icon={Users} color="bg-blue-500" />
              <StatCard title="Avg. Math Grade" value={stats.avgGrade} icon={BookOpen} color="bg-indigo-500" subtext="/ 20 points" />
              <StatCard title="Priority Intervention" value={stats.priority} icon={AlertCircle} color="bg-rose-500" subtext="Low Grade / High Potential" />
              <StatCard title="High Performers" value={stats.highPerformers} icon={TrendingUp} color="bg-emerald-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Chart Section */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Intervention Matrix</h2>
                    <p className="text-sm text-slate-500">X: Complexity to Improve • Y: Current Grade</p>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-rose-500"></div>Priority</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-indigo-500"></div>Standard</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-slate-300"></div>Difficult Context</div>
                  </div>
                </div>

                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis 
                        type="number" 
                        dataKey="ComplexityScore" 
                        name="Complexity" 
                        domain={[0, 1]} 
                        label={{ value: 'Complexity (0 = Easy to Help, 1 = Hard)', position: 'bottom', offset: 0, fontSize: 12, fill: '#94a3b8' }}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="ActualGrade" 
                        name="Grade" 
                        domain={[0, 20]} 
                        label={{ value: 'Current Math Grade', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#94a3b8' }}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                      
                      {/* Reference Lines */}
                      <ReferenceLine y={10} stroke="#cbd5e1" strokeDasharray="3 3" label={{ value: "Pass Grade", position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }} />
                      <ReferenceLine x={0.6} stroke="#cbd5e1" strokeDasharray="3 3" />

                      <Scatter 
                        data={results} 
                        onClick={(data) => setSelectedStudent(data.payload)}
                        cursor="pointer"
                      >
                        {results.map((entry, index) => {
                          // Color Logic
                          // Priority: Low Grade (<10) + Low Complexity (<0.6) = Red
                          // High Performers: Grade > 14 = Green
                          // Hard Cases: Complexity > 0.8 = Gray
                          let fill = "#6366f1"; // Default Indigo
                          if (entry.ActualGrade < 10 && entry.ComplexityScore < 0.6) fill = "#f43f5e"; // Rose (Priority)
                          else if (entry.ActualGrade >= 15) fill = "#10b981"; // Emerald
                          else if (entry.ComplexityScore > 0.8) fill = "#cbd5e1"; // Slate
                          
                          // Highlight selected
                          const isSelected = selectedStudent?.StudentID === entry.StudentID;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={fill} 
                              stroke={isSelected ? "#1e293b" : "none"}
                              strokeWidth={isSelected ? 3 : 0}
                              fillOpacity={isSelected ? 1 : 0.7}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sidebar: Details & List */}
              <div className="flex flex-col gap-6 h-[600px]">
                
                {/* 1. Selected Student Detail */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex-none h-48">
                  {selectedStudent ? (
                    <div className="h-full flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-xl font-bold text-slate-800">{selectedStudent.FirstName} {selectedStudent.FamilyName}</h3>
                          <span className="text-xs font-mono text-slate-400">ID: {selectedStudent.StudentID}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedStudent.ActualGrade < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {selectedStudent.ActualGrade < 10 ? 'At Risk' : 'On Track'}
                          </span>
                          <span className="text-xs text-slate-500">
                             Comp: {selectedStudent.ComplexityScore.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-semibold">Current</p>
                          <p className="text-2xl font-bold text-slate-700">{selectedStudent.ActualGrade}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-semibold">Potential</p>
                          <div className="flex items-baseline gap-1">
                            <p className="text-2xl font-bold text-indigo-600">{selectedStudent.PotentialGrade}</p>
                            <span className="text-xs text-indigo-500 font-medium">
                              (+{(selectedStudent.PotentialGrade - selectedStudent.ActualGrade).toFixed(1)})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                      <Search className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">Click a dot on the chart<br/>to view student details</p>
                    </div>
                  )}
                </div>

                {/* 2. Priority List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex-1 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-rose-500" />
                      Priority Action List
                    </h3>
                  </div>
                  <div className="overflow-y-auto p-0 flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-white sticky top-0 z-10 text-xs text-slate-400 uppercase font-semibold">
                        <tr>
                          <th className="px-4 py-2 bg-white">Name</th>
                          <th className="px-4 py-2 bg-white text-right">Grd</th>
                          <th className="px-4 py-2 bg-white text-right">Pot</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priorityList.filter(s => s.ActualGrade < 12).slice(0, 50).map((student) => (
                          <tr 
                            key={student.StudentID} 
                            onClick={() => setSelectedStudent(student)}
                            className={`cursor-pointer hover:bg-slate-50 border-b border-slate-50 transition ${selectedStudent?.StudentID === student.StudentID ? 'bg-indigo-50 hover:bg-indigo-50' : ''}`}
                          >
                            <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-[120px]">
                              {student.FirstName} {student.FamilyName}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">
                              {student.ActualGrade}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-green-600 font-bold">
                              {student.PotentialGrade}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}