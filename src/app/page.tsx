"use client";

import { useState, useMemo } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, UploadCloud, FileSpreadsheet, Activity, 
  CheckCircle2, AlertTriangle, AlertCircle, PenLine, Cpu 
} from "lucide-react";

type ExtractedField = { value: string; confidence: "high" | "medium" | "low" };

type AIResponse = {
  merchant: ExtractedField;
  date: ExtractedField;
  totalAmount: ExtractedField;
  currency: ExtractedField;
};

type ReceiptState = {
  id: string;
  fileName: string;
  status: "loading" | "success" | "error";
  originalData?: AIResponse;
  currentData?: {
    merchant: string;
    date: string;
    totalAmount: string;
    currency: string;
  };
};

// --- ENTERPRISE DATA SANITIZER ---
// Intercepts AI hallucinations (like outputting the word "null") and forces strict types
const sanitizeField = (fieldData: any): ExtractedField => {
  if (!fieldData) return { value: "", confidence: "low" };
  
  let val = fieldData.value;
  
  if (
    val === null || 
    val === undefined || 
    String(val).trim().toLowerCase() === "null" ||
    String(val).trim().toLowerCase() === "n/a" ||
    String(val).trim().toLowerCase() === "none"
  ) {
    val = "";
  } else {
    val = String(val); // Force numbers to strings safely
  }

  let conf = fieldData.confidence;
  if (conf !== "high" && conf !== "medium") conf = "low"; // Fallback for invalid AI confidences

  return { value: val, confidence: conf as "high" | "medium" | "low" };
};

export default function Dashboard() {
  const [receipts, setReceipts] = useState<ReceiptState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // --- ANALYTICS ENGINE ---
  const stats = useMemo(() => {
    let high = 0, medium = 0, low = 0, edited = 0;
    const processed = receipts.filter(r => r.status === "success" && r.currentData);
    
    processed.forEach(r => {
      (["merchant", "date", "totalAmount", "currency"] as const).forEach(field => {
        const isEdited = r.currentData![field] !== r.originalData![field].value;
        
        if (isEdited) {
          edited++;
        } else {
          const conf = r.originalData![field].confidence;
          if (conf === "high") high++;
          if (conf === "medium") medium++;
          if (conf === "low") low++;
        }
      });
    });

    return { total: processed.length, high, medium, low, edited };
  }, [receipts]);

  // --- CORE LOGIC ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    setIsUploading(true);

    const newReceipts = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      fileName: file.name,
      status: "loading" as const,
    }));

    setReceipts((prev) => [...newReceipts, ...prev]);

    await Promise.all(
      files.map(async (file, index) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/extract", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("Failed to extract");
          const rawData = await response.json();

          // Scrub the AI data through the sanitizer before it hits the UI
          const cleanData: AIResponse = {
            merchant: sanitizeField(rawData.merchant),
            date: sanitizeField(rawData.date),
            totalAmount: sanitizeField(rawData.totalAmount),
            currency: sanitizeField(rawData.currency),
          };

          setReceipts((prev) =>
            prev.map((r) =>
              r.id === newReceipts[index].id
                ? {
                    ...r,
                    status: "success",
                    originalData: cleanData,
                    currentData: {
                      merchant: cleanData.merchant.value,
                      date: cleanData.date.value,
                      totalAmount: cleanData.totalAmount.value,
                      currency: cleanData.currency.value,
                    },
                  }
                : r
            )
          );
        } catch (error) {
          setReceipts((prev) =>
            prev.map((r) =>
              r.id === newReceipts[index].id ? { ...r, status: "error" } : r
            )
          );
        }
      })
    );
    setIsUploading(false);
  };

  const handleEdit = (id: string, field: "merchant" | "date" | "totalAmount" | "currency", value: string) => {
    setReceipts((prev) =>
      prev.map((receipt) => {
        if (receipt.id === id && receipt.currentData) {
          return {
            ...receipt,
            currentData: { ...receipt.currentData, [field]: value },
          };
        }
        return receipt;
      })
    );
  };

  const removeReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));
  };

  const exportToCSV = () => {
    const successfulReceipts = receipts
      .filter((r) => r.status === "success" && r.currentData)
      .map((r) => ({
        FileName: r.fileName,
        Merchant: r.currentData!.merchant,
        Date: r.currentData!.date,
        TotalAmount: r.currentData!.totalAmount,
        Currency: r.currentData!.currency,
        EditedManually: Object.keys(r.currentData!).some(
          (key) => r.currentData![key as keyof typeof r.currentData] !== r.originalData![key as keyof AIResponse].value
        ) ? "Yes" : "No",
      }));

    if (successfulReceipts.length === 0) return alert("No valid data to export.");

    const csv = Papa.unparse(successfulReceipts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Processed_Receipts_Export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- DARK MODE STYLING ENGINE ---
  const getFieldStyle = (receipt: ReceiptState, fieldKey: keyof AIResponse) => {
    if (!receipt.originalData || !receipt.currentData) return "";
    
    const isEdited = receipt.currentData[fieldKey] !== receipt.originalData[fieldKey].value;
    if (isEdited) return "border-cyan-500/50 bg-cyan-950/20 text-cyan-50 focus:border-cyan-400 focus:ring-cyan-400/20";
    
    const confidence = receipt.originalData[fieldKey].confidence;
    if (confidence === "low") return "border-rose-500/50 bg-rose-950/20 text-rose-50 focus:border-rose-400 focus:ring-rose-400/20";
    if (confidence === "medium") return "border-amber-500/50 bg-amber-950/20 text-amber-50 focus:border-amber-400 focus:ring-amber-400/20";
    
    return "border-emerald-500/30 bg-slate-900/50 text-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] p-4 md:p-8 font-sans text-slate-200 selection:bg-cyan-500/30">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-800/60">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono font-medium mb-2">
              <Cpu className="w-3.5 h-3.5" />
              VISION PIPELINE ONLINE
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
              Receipt Auto-Fill Engine
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl leading-relaxed">
              High-throughput multimodal data extraction. Upload receipts to auto-populate structured parameters with predictive confidence scoring.
            </p>
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <Button onClick={exportToCSV} variant="outline" className="w-full md:w-auto bg-slate-900 border-slate-700 hover:bg-slate-800 hover:text-white text-slate-300 transition-all">
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-400" />
              Export CSV
            </Button>
            <div className="relative w-full md:w-auto">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <Button disabled={isUploading} className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)] transition-all border-none">
                <UploadCloud className="mr-2 h-4 w-4" />
                {isUploading ? "Processing..." : "Batch Upload"}
              </Button>
            </div>
          </div>
        </div>

        {/* CONFIDENCE ENGINE & ANALYTICS DASHBOARD */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-sm col-span-2 md:col-span-1">
            <CardContent className="p-4 flex flex-col justify-center items-center text-center h-full">
              <Activity className="h-6 w-6 text-slate-400 mb-2" />
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Receipts Processed</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase">High Confidence</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.high} <span className="text-sm font-normal text-slate-500">fields</span></div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase">Medium (Review)</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.medium} <span className="text-sm font-normal text-slate-500">fields</span></div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <span className="text-xs font-semibold text-rose-400 uppercase">Low (Verify)</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.low} <span className="text-sm font-normal text-slate-500">fields</span></div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <PenLine className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-400 uppercase">Manually Edited</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.edited} <span className="text-sm font-normal text-slate-500">fields</span></div>
            </CardContent>
          </Card>
        </div>

        {/* DATA GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {receipts.map((receipt) => (
            <Card key={receipt.id} className="bg-slate-900/60 border-slate-800 shadow-xl overflow-hidden hover:border-slate-700 transition-colors">
              <CardHeader className="bg-slate-950/50 border-b border-slate-800/60 py-3 px-4 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <CardTitle className="text-sm font-medium truncate max-w-[150px] text-slate-300 font-mono">
                    {receipt.fileName}
                  </CardTitle>
                  {receipt.status === "loading" && <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse">Extracting</Badge>}
                  {receipt.status === "error" && <Badge variant="destructive" className="bg-rose-500/20 text-rose-400 border-rose-500/30">Failed</Badge>}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-full"
                  onClick={() => removeReceipt(receipt.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>

              {receipt.status === "success" && receipt.currentData && (
                <CardContent className="p-5 space-y-4">
                  {(["merchant", "date", "totalAmount", "currency"] as const).map((field) => {
                    const isEdited = receipt.currentData![field] !== receipt.originalData![field].value;
                    const confidence = receipt.originalData![field].confidence;

                    return (
                      <div key={field} className="space-y-1.5 relative group">
                        <div className="flex justify-between items-center">
                          <Label className="capitalize text-[11px] font-bold text-slate-500 tracking-wider">
                            {field.replace(/([A-Z])/g, " $1")}
                          </Label>
                          {isEdited ? (
                            <span className="text-[9px] font-mono font-medium text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded border border-cyan-400/20">EDITED ↓</span>
                          ) : (
                            confidence !== "high" && (
                              <span className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                                confidence === "low" 
                                  ? "text-rose-400 bg-rose-400/10 border-rose-400/20" 
                                  : "text-amber-400 bg-amber-400/10 border-amber-400/20"
                              }`}>
                                {confidence.toUpperCase()}
                              </span>
                            )
                          )}
                        </div>
                        <Input
                          value={receipt.currentData![field]}
                          onChange={(e) => handleEdit(receipt.id, field, e.target.value)}
                          className={`h-9 text-sm font-medium transition-all duration-200 ${getFieldStyle(receipt, field)}`}
                        />
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {/* EMPTY STATE */}
        {receipts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 border border-dashed border-slate-800 rounded-xl bg-slate-900/20 backdrop-blur-sm">
            <div className="bg-cyan-500/10 p-4 rounded-full mb-4 shadow-[0_0_30px_rgba(8,145,178,0.15)] ring-1 ring-cyan-500/20">
              <Activity className="h-8 w-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2 tracking-wide">System Awaiting Input</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm text-center leading-relaxed">
              Initialize the pipeline by uploading structural or raw receipt images. The multimodal engine will parse and score data automatically.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}