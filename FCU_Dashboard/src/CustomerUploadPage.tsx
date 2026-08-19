import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import axios from "axios";
import { Upload, CheckCircle, FileText, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE_URL } from "./LoginPage";

interface RequestedDoc {
  id?: string;
  name: string;
  status: string;
}

export default function CustomerUploadPage() {
  const { leadId, shareId } = useParams();
  const [docs, setDocs] = useState<RequestedDoc[]>([]);
  const [customerInfo, setCustomerInfo] = useState<{name: string, id: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadSuccess, setUploadSuccess] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchLinkDetails = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/public/customer-upload/${leadId}/${shareId}`);
        if (res.data.status === 'success') {
          setDocs(res.data.data.requestedDocs);
          setCustomerInfo({ name: res.data.data.customerName, id: res.data.data.customerId });
        } else {
          setError(res.data.message || 'Failed to load upload portal');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid or expired link.');
      } finally {
        setLoading(false);
      }
    };
    fetchLinkDetails();
  }, [leadId, shareId]);

  const handleFileUpload = async (docName: string, missingDocId: string | undefined, file: File) => {
    if (!file) return;

    setUploading(prev => ({ ...prev, [docName]: true }));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docName', docName);
    if (missingDocId) formData.append('missingDocId', missingDocId);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/public/customer-upload/${leadId}/${shareId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.status === 'success') {
        setUploadSuccess(prev => ({ ...prev, [docName]: true }));
        setDocs(prev => prev.map(d => d.name === docName ? { ...d, status: 'UPLOADED' } : d));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(prev => ({ ...prev, [docName]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-secondary text-foreground font-sans flex flex-col">
      <Nav />
      
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 mt-12 mb-24">
        <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden relative">
          {/* Header */}
          <div className="bg-primary px-4 sm:px-8 py-6 sm:py-8 flex flex-col justify-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Document Upload Portal</h1>
            <p className="text-white opacity-80 mt-1.5 text-sm sm:text-base max-w-2xl">Please provide the requested documents to proceed with your application.</p>
            {customerInfo && (
              <div 
                className="mt-4 rounded-xl p-3 sm:p-5 inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 w-full sm:w-auto border"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Customer</span>
                  <span className="font-semibold text-sm sm:text-base text-white tracking-wide">{customerInfo.name}</span>
                </div>
                <div className="hidden sm:block w-px h-8" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}></div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase font-bold tracking-wider mb-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Application ID</span>
                  <span className="font-semibold text-sm sm:text-base text-white tracking-wide">{customerInfo.id}</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-8 bg-background rounded-b-2xl">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 size={40} className="animate-spin mb-4 text-primary" />
                <p className="text-lg font-medium">Loading your secure portal...</p>
              </div>
            ) : error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 flex flex-col items-center justify-center text-center py-16">
                <AlertCircle size={48} className="text-destructive mb-4" />
                <h3 className="text-xl font-bold text-destructive mb-2">Access Denied</h3>
                <p className="text-destructive/80">{error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-border gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Required Documents</h2>
                    <p className="text-sm text-muted-foreground mt-1">Upload clear, legible copies of the documents below.</p>
                  </div>
                  <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold flex-shrink-0 text-center">
                    {docs.filter(d => d.status === 'UPLOADED').length} / {docs.length} Completed
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {docs.map((doc, idx) => {
                    const isUploaded = doc.status === 'UPLOADED' || uploadSuccess[doc.name];
                    const isUploading = uploading[doc.name];

                    return (
                      <div key={idx} className={`p-4 sm:p-5 rounded-xl border ${isUploaded ? 'bg-ember/5 border-ember/20' : 'bg-card border-border hover:border-primary/30 shadow-sm'} transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6`}>
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`flex-shrink-0 p-3 rounded-full ${isUploaded ? 'bg-ember/10 text-ember' : 'bg-primary/10 text-primary'}`}>
                            {isUploaded ? <CheckCircle size={24} /> : <FileText size={24} />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{doc.name}</h3>
                            <p className="text-sm text-muted-foreground">{isUploaded ? 'Document successfully uploaded' : 'Pending upload'}</p>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {isUploaded ? (
                            <div className="flex items-center justify-center gap-2 text-ember font-semibold px-4 py-2 rounded-lg bg-ember/10 w-full sm:w-auto">
                              <CheckCircle size={18} /> Uploaded
                            </div>
                          ) : (
                            <div className="relative w-full sm:w-auto">
                              <input 
                                type="file" 
                                id={`file-upload-${idx}`}
                                className="hidden" 
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileUpload(doc.name, doc.id, e.target.files[0]);
                                  }
                                }}
                                disabled={isUploading}
                              />
                              <label 
                                htmlFor={`file-upload-${idx}`}
                                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-all w-full sm:w-auto ${isUploading ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md'}`}
                              >
                                {isUploading ? (
                                  <><Loader2 size={18} className="animate-spin" /> Uploading...</>
                                ) : (
                                  <><Upload size={18} /> Upload File</>
                                )}
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {docs.length > 0 && docs.every(d => d.status === 'UPLOADED') && (
                  <div className="mt-8 p-6 bg-ember/10 border border-ember/20 rounded-xl text-center">
                    <CheckCircle size={48} className="text-ember mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-foreground">All Set!</h3>
                    <p className="text-foreground/80 mt-1">Thank you. You have successfully uploaded all requested documents.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}