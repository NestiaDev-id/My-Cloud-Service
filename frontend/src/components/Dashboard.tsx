import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  FileText, 
  Folder, 
  Image as ImageIcon, 
  FileCode, 
  MoreVertical, 
  Grid, 
  List, 
  Clock, 
  HardDrive, 
  LogOut,
  ChevronDown,
  ChevronRight,
  Filter,
  Download,
  Trash2,
  Share2,
  ExternalLink,
  Pencil,
  FolderInput,
  Info,
  Cloud,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Upload,
  X,
  File
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Account, CloudFile, FileType } from '@/types';
import { useToast } from './Toast';

interface DashboardProps {
  activeAccount: Account;
  accounts: Account[];
  onLogout: () => void;
  onSwitchAccount: (id: string) => void;
}

const FILE_ICONS: Record<FileType, React.ReactNode> = {
  folder: <Folder className="w-5 h-5 text-amber-400 fill-amber-400" />,
  pdf: <FileText className="w-5 h-5 text-red-500" />,
  image: <ImageIcon className="w-5 h-5 text-blue-500" />,
  doc: <FileText className="w-5 h-5 text-blue-600" />,
  archive: <FileCode className="w-5 h-5 text-purple-500" />,
  other: <FileText className="w-5 h-5 text-gray-400" />,
};

export default function Dashboard({ activeAccount, accounts, onLogout, onSwitchAccount }: DashboardProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<'drive' | 'monitoring' | 'trash'>('drive');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<'name' | 'size' | 'lastModified'>('lastModified');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, fileId: string } | null>(null);
  const [movingFileIds, setMovingFileIds] = useState<string[]>([]);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{
    id: string;
    name: string;
    size: number;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
    startTime: number;
    estimatedTimeRemaining: number;
    previewUrl?: string;
  }[]>([]);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const { showToast } = useToast();

  // Mock initial files
  const [files, setFiles] = useState<CloudFile[]>([
    { id: '1', name: 'Project Roadmap.pdf', size: 2400000, type: 'pdf', lastModified: '2024-03-20T10:30:00Z', ownerId: activeAccount.id, thumbnailUrl: 'https://picsum.photos/seed/pdf/400/400' },
    { id: '2', name: 'Design Assets', size: 0, type: 'folder', lastModified: '2024-03-19T15:45:00Z', ownerId: activeAccount.id, itemCount: 24 },
    { id: '3', name: 'Vacation Photos', size: 0, type: 'folder', lastModified: '2024-03-18T09:12:00Z', ownerId: activeAccount.id, itemCount: 156 },
    { id: '4', name: 'Budget_2024.xlsx', size: 1200000, type: 'doc', lastModified: '2024-03-21T14:20:00Z', ownerId: activeAccount.id, thumbnailUrl: 'https://picsum.photos/seed/doc/400/400' },
    { id: '5', name: 'profile-pic.jpg', size: 850000, type: 'image', lastModified: '2024-03-15T11:00:00Z', ownerId: activeAccount.id, thumbnailUrl: 'https://picsum.photos/seed/profile/400/400' },
    { id: '6', name: 'source-code.zip', size: 15600000, type: 'archive', lastModified: '2024-03-22T16:40:00Z', ownerId: activeAccount.id },
    // Nested files in 'Design Assets' (id: '2')
    { id: '7', name: 'Logo_Final.png', size: 450000, type: 'image', lastModified: '2024-03-23T10:00:00Z', ownerId: activeAccount.id, parentId: '2', thumbnailUrl: 'https://picsum.photos/seed/logo/400/400' },
    { id: '8', name: 'Brand_Guidelines.pdf', size: 5600000, type: 'pdf', lastModified: '2024-03-23T11:30:00Z', ownerId: activeAccount.id, parentId: '2', thumbnailUrl: 'https://picsum.photos/seed/brand/400/400' },
    // Nested files in 'Vacation Photos' (id: '3')
    { id: '9', name: 'Beach.jpg', size: 1200000, type: 'image', lastModified: '2024-03-24T14:00:00Z', ownerId: activeAccount.id, parentId: '3', thumbnailUrl: 'https://picsum.photos/seed/beach/400/400' },
  ]);

  const handleUpload = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const newFiles = Array.from(selectedFiles);
    setPendingFiles(prev => [...prev, ...newFiles]);
    setIsUploadModalOpen(true);
  };

  const startUpload = () => {
    if (pendingFiles.length === 0) return;

    const filesToUpload = pendingFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 9),
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading' as const,
      startTime: Date.now(),
      estimatedTimeRemaining: 0,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      fileRef: file
    }));

    setUploadingFiles(prev => [...prev, ...filesToUpload]);
    setPendingFiles([]);

    filesToUpload.forEach(uploadingFile => {
      let progress = 0;
      const totalSize = uploadingFile.size;
      const uploadSpeed = Math.random() * 500000 + 200000; // random speed between 200KB/s and 700KB/s
      
      const interval = setInterval(() => {
        progress += (uploadSpeed / 10); // update every 100ms
        const percent = Math.min(Math.round((progress / totalSize) * 100), 100);
        
        const elapsedTime = (Date.now() - uploadingFile.startTime) / 1000;
        const currentSpeed = progress / elapsedTime;
        const remainingSize = totalSize - progress;
        const eta = Math.max(0, Math.round(remainingSize / currentSpeed));

        setUploadingFiles(prev => prev.map(f => 
          f.id === uploadingFile.id 
            ? { ...f, progress: percent, estimatedTimeRemaining: eta, status: percent === 100 ? 'completed' : 'uploading' } 
            : f
        ));

        if (percent === 100) {
          clearInterval(interval);
          
          // Add to actual files list
          const newFile: CloudFile = {
            id: uploadingFile.id,
            name: uploadingFile.name,
            size: uploadingFile.size,
            type: uploadingFile.fileRef.type.includes('image') ? 'image' : uploadingFile.fileRef.type.includes('pdf') ? 'pdf' : 'other',
            lastModified: new Date().toISOString(),
            ownerId: activeAccount.id,
            parentId: currentFolderId || undefined,
            thumbnailUrl: uploadingFile.previewUrl || (uploadingFile.fileRef.type.includes('image') ? `https://picsum.photos/seed/${Math.random()}/400/400` : undefined),
          };

          setFiles(prev => [newFile, ...prev]);
          showToast(`${uploadingFile.name} uploaded successfully!`, 'success');
        }
      }, 100);
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  const selectedFile = useMemo(() => 
    files.find(f => f.id === selectedFileIds[0]), 
  [files, selectedFileIds]);

  const processedFiles = useMemo(() => {
    let result = files.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
      (activeTab === 'trash' ? f.isDeleted : (!f.isDeleted && f.parentId === (currentFolderId || undefined)))
    );
    
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'size') {
        comparison = a.size - b.size;
      } else if (sortField === 'lastModified') {
        comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [files, searchQuery, sortField, sortDirection, currentFolderId, activeTab]);

  const breadcrumbs = useMemo(() => {
    const crumbs = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = files.find(f => f.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.parentId || null;
      } else {
        break;
      }
    }
    return crumbs;
  }, [files, currentFolderId]);

  const handleFolderDoubleClick = (file: CloudFile) => {
    if (file.type === 'folder' && !file.isDeleted) {
      setCurrentFolderId(file.id);
      setSelectedFileIds([]);
    }
  };

  const toggleFileSelection = (fileId: string, isMulti: boolean) => {
    if (isMulti) {
      setSelectedFileIds(prev => 
        prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
      );
    } else {
      setSelectedFileIds([fileId]);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      fileId
    });
    if (!selectedFileIds.includes(fileId)) {
      setSelectedFileIds([fileId]);
    }
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleMoveToTrash = (fileIds: string[]) => {
    setFiles(prev => prev.map(f => fileIds.includes(f.id) ? { ...f, isDeleted: true } : f));
    showToast(`${fileIds.length} item(s) moved to trash`, 'info');
    setSelectedFileIds([]);
  };

  const handleRestoreFiles = (fileIds: string[]) => {
    setFiles(prev => prev.map(f => fileIds.includes(f.id) ? { ...f, isDeleted: false } : f));
    showToast(`${fileIds.length} item(s) restored`, 'success');
    setSelectedFileIds([]);
  };

  const handlePermanentDelete = (fileIds: string[]) => {
    setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
    showToast(`${fileIds.length} item(s) deleted permanently`, 'success');
    setSelectedFileIds([]);
  };

  const handleRenameFile = () => {
    if (!renamingFileId || !newName.trim()) return;
    setFiles(prev => prev.map(f => f.id === renamingFileId ? { ...f, name: newName.trim(), lastModified: new Date().toISOString() } : f));
    showToast(`Renamed to ${newName}`, 'success');
    setIsRenameModalOpen(false);
    setRenamingFileId(null);
    setNewName('');
  };

  const handleCreateFolder = (folderName: string) => {
    if (!folderName.trim()) return;
    const newFolder: CloudFile = {
      id: Math.random().toString(36).substring(2, 9),
      name: folderName.trim(),
      size: 0,
      type: 'folder',
      lastModified: new Date().toISOString(),
      ownerId: activeAccount.id,
      parentId: currentFolderId || undefined,
      itemCount: 0
    };
    setFiles(prev => [newFolder, ...prev]);
    showToast(`Folder "${folderName}" created`, 'success');
    setIsCreateFolderModalOpen(false);
    setNewName('');
  };

  const handleMoveFiles = (fileIds: string[], targetFolderId: string | null) => {
    // Prevent moving a folder into itself
    if (fileIds.some(id => id === targetFolderId)) {
      showToast("Cannot move a folder into itself", "error");
      return;
    }

    setFiles(prev => prev.map(f => fileIds.includes(f.id) ? { ...f, parentId: targetFolderId || undefined, lastModified: new Date().toISOString() } : f));
    const targetFolder = targetFolderId ? files.find(f => f.id === targetFolderId) : { name: 'My Drive' };
    showToast(`${fileIds.length} item(s) moved to ${targetFolder?.name}`, 'success');
    setMovingFileIds([]);
    setSelectedFileIds([]);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '--';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Cloud className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">My Cloud</span>
        </div>

        <div className="px-4 mb-6">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-4 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-3 transition-all group cursor-pointer"
          >
            <Plus className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            New
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {[
            { id: 'drive', icon: <HardDrive className="w-5 h-5" />, label: 'My Drive' },
            { id: 'monitoring', icon: <Activity className="w-5 h-5" />, label: 'Monitoring' },
            { id: 'recent', icon: <Clock className="w-5 h-5" />, label: 'Recent' },
            { id: 'shared', icon: <Share2 className="w-5 h-5" />, label: 'Shared' },
            { id: 'trash', icon: <Trash2 className="w-5 h-5" />, label: 'Trash' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'drive' || item.id === 'monitoring' || item.id === 'trash') {
                  setActiveTab(item.id as any);
                  setCurrentFolderId(null);
                  setSelectedFileIds([]);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                activeTab === item.id ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
              <span>Storage</span>
              <span>75% used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
              <div className="bg-blue-600 h-1.5 rounded-full w-3/4"></div>
            </div>
            <p className="text-[10px] text-gray-400">11.2 GB of 15 GB used</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search in Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-xl transition-all outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-4 ml-4">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700")}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-700")}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-full transition-all"
              >
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm", activeAccount.color)}>
                  {activeAccount.name[0]}
                </div>
                <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", isAccountMenuOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {isAccountMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsAccountMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 py-4 z-30"
                    >
                      <div className="px-6 py-4 border-b border-gray-50 text-center">
                        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg", activeAccount.color)}>
                          {activeAccount.name[0]}
                        </div>
                        <h3 className="font-bold text-gray-900">{activeAccount.name}</h3>
                        <p className="text-sm text-gray-500">{activeAccount.email}</p>
                      </div>
                      
                      <div className="py-2">
                        <p className="px-6 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Switch Account</p>
                        {accounts.filter(a => a.id !== activeAccount.id).map(account => (
                          <button
                            key={account.id}
                            onClick={() => {
                              onSwitchAccount(account.id);
                              setIsAccountMenuOpen(false);
                              showToast(`Switched to ${account.name}`, 'success');
                            }}
                            className="w-full flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold", account.color)}>
                              {account.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{account.name}</p>
                              <p className="text-xs text-gray-500 truncate">{account.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-50 px-2">
                        <button 
                          onClick={() => {
                            onLogout();
                            showToast('Signed out of all accounts', 'info');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out of all accounts
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'drive' || activeTab === 'trash' ? (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className="relative min-h-full"
                  onClick={() => {
                    setSelectedFileIds([]);
                    closeContextMenu();
                  }}
                >
                <AnimatePresence>
                  {isDragging && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 bg-blue-600/10 border-2 border-dashed border-blue-600 rounded-3xl flex items-center justify-center backdrop-blur-[2px]"
                    >
                      <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Upload className="w-8 h-8 text-blue-600 animate-bounce" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Drop files to upload</h3>
                        <p className="text-gray-500 mt-2">Release to start uploading to My Drive</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isUploading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm"
                    >
                      <div className="bg-white p-4 rounded-2xl shadow-2xl border border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                              <File className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">Uploading file...</p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{uploadProgress}% complete</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setIsUploading(false)}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            className="bg-blue-600 h-full rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-500 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
                    <button 
                      onClick={() => setCurrentFolderId(null)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors",
                        currentFolderId === null ? "text-blue-600 font-bold bg-blue-50" : "hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <HardDrive className="w-4 h-4" />
                      My Drive
                    </button>
                    {breadcrumbs.map((crumb, index) => (
                      <React.Fragment key={crumb.id}>
                        <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        <button 
                          onClick={() => setCurrentFolderId(crumb.id)}
                          className={cn(
                            "px-2 py-1 rounded-lg transition-colors",
                            index === breadcrumbs.length - 1 ? "text-blue-600 font-bold bg-blue-50" : "hover:bg-gray-100 hover:text-gray-900"
                          )}
                        >
                          {crumb.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h2 className="text-xl font-bold text-gray-900">
                        {activeTab === 'trash' ? 'Trash' : (currentFolderId ? breadcrumbs[breadcrumbs.length - 1]?.name : "My Drive")}
                      </h2>
                      {activeTab === 'trash' && (
                        <button 
                          onClick={() => handlePermanentDelete(files.filter(f => f.isDeleted).map(f => f.id))}
                          className="text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors bg-red-50 px-2 py-1 rounded-lg uppercase tracking-wider"
                        >
                          Empty Trash
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                    <div className="relative">
                      <button 
                        onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        Sort by {sortField === 'lastModified' ? 'Date' : sortField.charAt(0).toUpperCase() + sortField.slice(1)}
                        <ChevronDown className={cn("w-3 h-3 transition-transform", isSortMenuOpen && "rotate-180")} />
                      </button>

                      <AnimatePresence>
                        {isSortMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsSortMenuOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 5, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 5, scale: 0.95 }}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-30"
                            >
                              {[
                                { id: 'name', label: 'Name' },
                                { id: 'size', label: 'Size' },
                                { id: 'lastModified', label: 'Last Modified' },
                              ].map((option) => (
                                <button
                                  key={option.id}
                                  onClick={() => {
                                    if (sortField === option.id) {
                                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setSortField(option.id as any);
                                      setSortDirection('asc');
                                    }
                                    setIsSortMenuOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                  {option.label}
                                  {sortField === option.id && (
                                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                      <Filter className="w-4 h-4" />
                      Filter
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Actions Toolbar */}
              <AnimatePresence>
                {selectedFileIds.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 z-50"
                  >
                    <span className="text-sm font-bold border-r border-gray-700 pr-6">
                      {selectedFileIds.length} selected
                    </span>
                    <div className="flex items-center gap-4">
                      {activeTab === 'trash' ? (
                        <>
                          <button 
                            onClick={() => handleRestoreFiles(selectedFileIds)}
                            className="flex items-center gap-2 hover:text-blue-400 transition-colors text-sm font-bold"
                          >
                            <RefreshCw className="w-4 h-4" />
                            Restore
                          </button>
                          <button 
                            onClick={() => handlePermanentDelete(selectedFileIds)}
                            className="flex items-center gap-2 hover:text-red-400 transition-colors text-sm font-bold"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Forever
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleMoveToTrash(selectedFileIds)}
                            className="flex items-center gap-2 hover:text-red-400 transition-colors text-sm font-bold"
                          >
                            <Trash2 className="w-4 h-4" />
                            Move to Trash
                          </button>
                          <button 
                            onClick={() => {
                              setMovingFileIds(selectedFileIds);
                            }}
                            className="flex items-center gap-2 hover:text-blue-400 transition-colors text-sm font-bold"
                          >
                            <FolderInput className="w-4 h-4" />
                            Move to
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => setSelectedFileIds([])}
                        className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {viewMode === 'list' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          <th 
                            className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => {
                              if (sortField === 'name') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              else { setSortField('name'); setSortDirection('asc'); }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              Name
                              {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            </div>
                          </th>
                          <th 
                            className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => {
                              if (sortField === 'lastModified') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              else { setSortField('lastModified'); setSortDirection('asc'); }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              Last Modified
                              {sortField === 'lastModified' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            </div>
                          </th>
                          <th 
                            className="px-6 py-4 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => {
                              if (sortField === 'size') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                              else { setSortField('size'); setSortDirection('asc'); }
                            }}
                          >
                            <div className="flex items-center gap-1">
                              File Size
                              {sortField === 'size' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            </div>
                          </th>
                          <th className="px-6 py-4 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {processedFiles.map((file) => (
                          <tr 
                            key={file.id} 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFileSelection(file.id, e.ctrlKey || e.metaKey);
                              closeContextMenu();
                            }}
                            onDoubleClick={() => handleFolderDoubleClick(file)}
                            onContextMenu={(e) => handleContextMenu(e, file.id)}
                            className={cn(
                              "group transition-colors cursor-pointer border-b border-gray-50 last:border-0",
                              selectedFileIds.includes(file.id) ? "bg-blue-50/50" : "hover:bg-gray-50/50"
                            )}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {FILE_ICONS[file.type]}
                                <span className={cn("text-sm font-medium group-hover:text-blue-600 transition-colors truncate max-w-xs", selectedFileIds.includes(file.id) ? "text-blue-600" : "text-gray-700")}>
                                  {file.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500">
                              {format(new Date(file.lastModified), 'MMM d, yyyy')}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                              {file.type === 'folder' ? `${file.itemCount || 0} items` : formatSize(file.size)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {activeTab === 'trash' ? (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRestoreFiles([file.id]);
                                      }}
                                      className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-green-600 transition-all shadow-sm border border-transparent hover:border-green-100"
                                      title="Restore"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePermanentDelete([file.id]);
                                      }}
                                      className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-600 transition-all shadow-sm border border-transparent hover:border-red-100"
                                      title="Delete Forever"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        showToast(`Downloading ${file.name}...`, 'info');
                                        setTimeout(() => showToast(`${file.name} downloaded successfully`, 'success'), 2000);
                                      }}
                                      className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-blue-600 transition-all shadow-sm border border-transparent hover:border-blue-100"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleContextMenu(e, file.id);
                                      }}
                                      className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-all"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {processedFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        whileHover={{ y: -4 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFileSelection(file.id, e.ctrlKey || e.metaKey);
                          closeContextMenu();
                        }}
                        onDoubleClick={() => handleFolderDoubleClick(file)}
                        onContextMenu={(e) => handleContextMenu(e, file.id)}
                        className={cn(
                          "p-4 rounded-2xl shadow-sm border transition-all group cursor-pointer",
                          selectedFileIds.includes(file.id) 
                            ? "bg-blue-50 border-blue-200 shadow-md ring-2 ring-blue-100" 
                            : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-md"
                        )}
                      >
                        <div className="aspect-square bg-gray-50 rounded-xl mb-4 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                          {React.cloneElement(FILE_ICONS[file.type] as React.ReactElement<{ className?: string }>, { className: "w-12 h-12" })}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn("text-sm font-semibold truncate group-hover:text-blue-600 transition-colors", selectedFileIds.includes(file.id) ? "text-blue-600" : "text-gray-800")}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {format(new Date(file.lastModified), 'MMM d')} • {file.type === 'folder' ? `${file.itemCount || 0} items` : formatSize(file.size)}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleContextMenu(e, file.id);
                            }}
                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                
                {processedFiles.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No files found</h3>
                    <p className="text-gray-500 max-w-xs mt-1">Try adjusting your search or upload something new.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="monitoring"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Account Monitoring</h2>
                    <p className="text-sm text-gray-500 mt-1">Real-time status of all connected cloud accounts</p>
                  </div>
                  <button 
                    onClick={() => {
                      showToast('Refreshing account statuses...', 'info');
                      setTimeout(() => showToast('Statuses updated successfully', 'success'), 1500);
                    }}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Status
                  </button>
                </div>

                <div className="grid gap-4">
                  {accounts.map((account) => (
                    <div 
                      key={account.id}
                      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg", account.color)}>
                          {account.name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{account.name}</h3>
                          <p className="text-sm text-gray-500">{account.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-12">
                        <div className="w-48 hidden lg:block">
                          <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                            <span>Storage</span>
                            <span>{Math.round((account.usedStorage / account.totalStorage) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden border border-gray-100">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(account.usedStorage / account.totalStorage) * 100}%` }}
                              className={cn(
                                "h-full rounded-full",
                                (account.usedStorage / account.totalStorage) > 0.9 ? "bg-red-500" : "bg-blue-600"
                              )}
                            />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1.5">
                            {formatSize(account.usedStorage)} of {formatSize(account.totalStorage)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Checked</p>
                          <p className="text-sm font-medium text-gray-700">{format(new Date(account.lastCheck), 'HH:mm:ss')}</p>
                        </div>

                        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                          {account.status === 'connected' ? (
                            <>
                              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5" />
                                Connected
                              </div>
                              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                                <XCircle className="w-5 h-5" />
                                Disconnected
                              </div>
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                            </>
                          )}
                        </div>

                        <button 
                          onClick={() => showToast(`Diagnostic report for ${account.name} generated.`, 'info')}
                          className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
                        >
                          <AlertCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* System Health Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                  <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-200">
                    <p className="text-blue-100 text-sm font-medium mb-1">Total Accounts</p>
                    <p className="text-3xl font-bold">{accounts.length}</p>
                  </div>
                  <div className="bg-emerald-500 p-6 rounded-3xl text-white shadow-xl shadow-emerald-100">
                    <p className="text-emerald-100 text-sm font-medium mb-1">Healthy</p>
                    <p className="text-3xl font-bold">{accounts.filter(a => a.status === 'connected').length}</p>
                  </div>
                  <div className="bg-red-500 p-6 rounded-3xl text-white shadow-xl shadow-red-100">
                    <p className="text-red-100 text-sm font-medium mb-1">Issues Detected</p>
                    <p className="text-3xl font-bold">{accounts.filter(a => a.status === 'disconnected').length}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>        {/* Details Panel */}
        <AnimatePresence>
          {selectedFileIds.length > 0 && (activeTab === 'drive' || activeTab === 'trash') && (
            <motion.aside
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-80 bg-white border-l border-gray-200 flex flex-col z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">
                  {selectedFileIds.length > 1 ? `${selectedFileIds.length} items selected` : 'Details'}
                </h3>
                <button 
                  onClick={() => setSelectedFileIds([])}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {selectedFileIds.length === 1 && selectedFile ? (
                  <>
                    <div className="aspect-square bg-gray-50 rounded-3xl flex items-center justify-center mb-6 border border-gray-100 shadow-inner overflow-hidden relative group">
                      {selectedFile.thumbnailUrl ? (
                        <img 
                          src={selectedFile.thumbnailUrl} 
                          alt={selectedFile.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          {React.cloneElement(FILE_ICONS[selectedFile.type] as React.ReactElement<{ className?: string }>, { className: "w-24 h-24 drop-shadow-sm" })}
                          {selectedFile.type === 'folder' && (
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Folder Preview Not Available</span>
                          )}
                        </div>
                      )}
                      {selectedFile.type !== 'folder' && !selectedFile.isDeleted && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button 
                            onClick={() => showToast(`Opening preview for ${selectedFile.name}`, 'info')}
                            className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl text-blue-600 hover:scale-110 transition-transform"
                          >
                            <ExternalLink className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 mb-6 break-words leading-tight">
                      {selectedFile.name}
                    </h4>

                    <div className="space-y-6">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Properties</p>
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="text-xs text-gray-500">Type</span>
                            <span className="text-xs font-semibold text-gray-900 uppercase">{selectedFile.type}</span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs text-gray-500">Size</span>
                            <span className="text-xs font-semibold text-gray-900">
                              {selectedFile.type === 'folder' ? '--' : formatSize(selectedFile.size)}
                            </span>
                          </div>
                          {selectedFile.type === 'folder' && (
                            <div className="flex justify-between items-start">
                              <span className="text-xs text-gray-500">Contains</span>
                              <span className="text-xs font-semibold text-gray-900">
                                {selectedFile.itemCount || 0} items
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-start">
                            <span className="text-xs text-gray-500">Last Modified</span>
                            <span className="text-xs font-semibold text-gray-900">
                              {format(new Date(selectedFile.lastModified), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs text-gray-500">Owner</span>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white", activeAccount.color)}>
                                {activeAccount.name[0]}
                              </div>
                              <span className="text-xs font-semibold text-gray-900">{activeAccount.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Actions</p>
                        <div className="grid grid-cols-2 gap-3">
                          {activeTab === 'trash' ? (
                            <>
                              <button 
                                onClick={() => handleRestoreFiles([selectedFile.id])}
                                className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-xl text-xs font-bold text-blue-700 transition-all border border-blue-100"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Restore
                              </button>
                              <button 
                                onClick={() => handlePermanentDelete([selectedFile.id])}
                                className="flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold text-red-700 transition-all border border-red-100"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => {
                                  setRenamingFileId(selectedFile.id);
                                  setNewName(selectedFile.name);
                                  setIsRenameModalOpen(true);
                                }}
                                className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-all border border-gray-100"
                              >
                                <Pencil className="w-4 h-4" />
                                Rename
                              </button>
                              <button 
                                onClick={() => setMovingFileIds([selectedFile.id])}
                                className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-all border border-gray-100"
                              >
                                <FolderInput className="w-4 h-4" />
                                Move
                              </button>
                              <button 
                                onClick={() => {
                                  showToast(`Downloading ${selectedFile.name}...`, 'info');
                                  setTimeout(() => showToast(`${selectedFile.name} downloaded successfully`, 'success'), 2000);
                                }}
                                className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all shadow-sm shadow-blue-200"
                              >
                                <Download className="w-4 h-4" />
                                Download
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="aspect-square bg-gray-50 rounded-3xl flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex -space-x-4">
                          {[...Array(Math.min(3, selectedFileIds.length))].map((_, i) => (
                            <div key={i} className="w-16 h-16 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-center transform rotate-[-5deg] even:rotate-[5deg]">
                              <File className="w-8 h-8 text-blue-600" />
                            </div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">Multiple Selection</span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-gray-500">Items Selected</span>
                        <span className="text-xs font-semibold text-gray-900">{selectedFileIds.length}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-gray-500">Total Size</span>
                        <span className="text-xs font-semibold text-gray-900">
                          {formatSize(files.filter(f => selectedFileIds.includes(f.id)).reduce((acc, f) => acc + f.size, 0))}
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Bulk Actions</p>
                      <div className="grid grid-cols-1 gap-3">
                        {activeTab === 'trash' ? (
                          <>
                            <button 
                              onClick={() => handleRestoreFiles(selectedFileIds)}
                              className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition-all shadow-sm shadow-blue-200"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Restore Selected Items
                            </button>
                            <button 
                              onClick={() => handlePermanentDelete(selectedFileIds)}
                              className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold text-red-700 transition-all border border-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Permanently
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleMoveToTrash(selectedFileIds)}
                              className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 rounded-xl text-xs font-bold text-red-700 transition-all border border-red-100"
                            >
                              <Trash2 className="w-4 h-4" />
                              Move to Trash
                            </button>
                            <button 
                              onClick={() => {
                                showToast("Bulk move coming soon", "info");
                              }}
                              className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-700 transition-all border border-gray-100"
                            >
                              <FolderInput className="w-4 h-4" />
                              Move to Folder
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <>
              <div 
                className="fixed inset-0 z-[100]" 
                onClick={closeContextMenu}
                onContextMenu={(e) => {
                  e.preventDefault();
                  closeContextMenu();
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                style={{ 
                  position: 'fixed', 
                  top: contextMenu.y, 
                  left: contextMenu.x,
                  zIndex: 101
                }}
                className="w-56 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 overflow-hidden"
              >
                {selectedFileIds.length > 1 ? (
                  <>
                    {activeTab === 'trash' ? (
                      <>
                        <button 
                          onClick={() => {
                            handleRestoreFiles(selectedFileIds);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Restore {selectedFileIds.length} items
                        </button>
                        <button 
                          onClick={() => {
                            handlePermanentDelete(selectedFileIds);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            handleMoveToTrash(selectedFileIds);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Move to trash
                        </button>
                        <button 
                          onClick={() => {
                            setMovingFileIds(selectedFileIds);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <FolderInput className="w-4 h-4" />
                          Move to folder
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {files.find(f => f.id === contextMenu.fileId)?.isDeleted ? (
                      <>
                        <button 
                          onClick={() => {
                            handleRestoreFiles([contextMenu.fileId]);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Restore
                        </button>
                        <button 
                          onClick={() => {
                            handlePermanentDelete([contextMenu.fileId]);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </>
                    ) : (
                      <>
                        {files.find(f => f.id === contextMenu.fileId)?.type === 'folder' ? (
                          <button 
                            onClick={() => {
                              const file = files.find(f => f.id === contextMenu.fileId);
                              if (file) handleFolderDoubleClick(file);
                              closeContextMenu();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              const file = files.find(f => f.id === contextMenu.fileId);
                              if (file) {
                                showToast(`Downloading ${file.name}...`, 'info');
                                setTimeout(() => showToast(`${file.name} downloaded successfully`, 'success'), 2000);
                              }
                              closeContextMenu();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        )}
                        
                        <button 
                          onClick={() => {
                            const file = files.find(f => f.id === contextMenu.fileId);
                            if (file) showToast(`Sharing ${file.name}...`, 'info');
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        
                        <div className="h-px bg-gray-50 my-1" />
                        
                        <button 
                          onClick={() => {
                            const file = files.find(f => f.id === contextMenu.fileId);
                            if (file) {
                              setRenamingFileId(file.id);
                              setNewName(file.name);
                              setIsRenameModalOpen(true);
                            }
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          Rename
                        </button>
                        
                        <button 
                          onClick={() => {
                            const file = files.find(f => f.id === contextMenu.fileId);
                            if (file) setMovingFileIds([file.id]);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <FolderInput className="w-4 h-4" />
                          Move to
                        </button>
                        
                        <div className="h-px bg-gray-50 my-1" />
                        
                        <button 
                          onClick={() => {
                            const file = files.find(f => f.id === contextMenu.fileId);
                            if (file) setSelectedFileIds([file.id]);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          <Info className="w-4 h-4" />
                          View details
                        </button>
                        
                        <button 
                          onClick={() => {
                            handleMoveToTrash([contextMenu.fileId]);
                            closeContextMenu();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Move to trash
                        </button>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Rename Modal */}
        <AnimatePresence>
          {isRenameModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                onClick={() => setIsRenameModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-6"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4">Rename</h3>
                <input 
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all mb-6"
                  placeholder="Enter new name"
                />
                <div className="flex justify-end gap-3">
                  <button 
                    onClick={() => setIsRenameModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRenameFile}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-200"
                  >
                    Rename
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Move To Modal */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                onClick={() => {
                  if (uploadingFiles.every(f => f.status === 'completed') && pendingFiles.length === 0) {
                    setIsUploadModalOpen(false);
                    setUploadingFiles([]);
                    setPendingFiles([]);
                  }
                }}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20"
              >
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">New Item</h3>
                    <p className="text-sm text-gray-500 font-medium">Upload files or create new folders</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setUploadingFiles([]);
                      setPendingFiles([]);
                    }}
                    className="p-3 hover:bg-white rounded-2xl text-gray-400 hover:text-gray-900 transition-all shadow-sm border border-transparent hover:border-gray-100"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="p-8">
                  {uploadingFiles.length === 0 && pendingFiles.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <button 
                          onClick={() => setIsCreateFolderModalOpen(true)}
                          className="w-full flex items-center gap-4 p-5 bg-amber-50 hover:bg-amber-100 rounded-3xl transition-all group border border-amber-100"
                        >
                          <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                            <Folder className="text-white w-6 h-6 fill-white" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-900">New Folder</p>
                            <p className="text-xs text-amber-700 font-medium">Create a directory</p>
                          </div>
                        </button>

                        <label className="w-full flex items-center gap-4 p-5 bg-blue-50 hover:bg-blue-100 rounded-3xl transition-all group border border-blue-100 cursor-pointer">
                          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                            <Upload className="text-white w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-900">Upload Files</p>
                            <p className="text-xs text-blue-700 font-medium">Select from computer</p>
                          </div>
                          <input 
                            type="file" 
                            multiple
                            className="hidden" 
                            onChange={(e) => handleUpload(e.target.files)}
                          />
                        </label>

                        <label className="w-full flex items-center gap-4 p-5 bg-purple-50 hover:bg-purple-100 rounded-3xl transition-all group border border-purple-100 cursor-pointer">
                          <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                            <FolderInput className="text-white w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-gray-900">Upload Folder</p>
                            <p className="text-xs text-purple-700 font-medium">Upload entire directory</p>
                          </div>
                          <input 
                            type="file" 
                            multiple
                            // @ts-ignore
                            webkitdirectory=""
                            directory=""
                            className="hidden" 
                            onChange={(e) => handleUpload(e.target.files)}
                          />
                        </label>
                      </div>

                      <div 
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        className={cn(
                          "relative border-3 border-dashed rounded-[2rem] p-8 transition-all duration-300 flex flex-col items-center justify-center group",
                          isDragging 
                            ? "border-blue-500 bg-blue-50/50 scale-[0.98]" 
                            : "border-gray-200 hover:border-blue-400 hover:bg-gray-50/50"
                        )}
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-500">
                          <Upload className="text-gray-400 w-8 h-8 group-hover:text-white" />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">Drop files here</h4>
                        <p className="text-gray-400 text-xs font-medium text-center">
                          Drag and drop files to start uploading
                        </p>
                      </div>
                    </div>
                  ) : pendingFiles.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-bold text-gray-900">Selected Files ({pendingFiles.length})</h4>
                        <button 
                          onClick={() => setPendingFiles([])}
                          className="text-sm font-bold text-red-600 hover:text-red-700"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {pendingFiles.map((file, idx) => {
                          const isImage = file.type.startsWith('image/');
                          const previewUrl = isImage ? URL.createObjectURL(file) : null;
                          
                          return (
                            <div key={idx} className="relative group bg-gray-50 rounded-3xl p-3 border border-gray-100 hover:border-blue-200 transition-all">
                              <div className="aspect-square rounded-2xl bg-white mb-3 overflow-hidden flex items-center justify-center shadow-sm">
                                {isImage ? (
                                  <img src={previewUrl!} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <File className="w-8 h-8 text-gray-300" />
                                )}
                              </div>
                              <p className="text-xs font-bold text-gray-900 truncate">{file.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{formatSize(file.size)}</p>
                              
                              <button 
                                onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                        
                        <label className="aspect-square rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer group">
                          <Plus className="w-6 h-6 text-gray-300 group-hover:text-blue-500" />
                          <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600">Add more</span>
                          <input 
                            type="file" 
                            multiple
                            className="hidden" 
                            onChange={(e) => handleUpload(e.target.files)}
                          />
                        </label>
                      </div>

                      <div className="pt-4 flex gap-4">
                        <button 
                          onClick={() => setPendingFiles([])}
                          className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={startUpload}
                          className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2"
                        >
                          <Upload className="w-5 h-5" />
                          Start Uploading
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-900">
                          {uploadingFiles.filter(f => f.status === 'completed').length} of {uploadingFiles.length} files uploaded
                        </span>
                        <button 
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.multiple = true;
                            input.onchange = (e) => handleUpload((e.target as HTMLInputElement).files);
                            input.click();
                          }}
                          className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Add more files
                        </button>
                      </div>
                      
                      <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {uploadingFiles.map((file) => (
                          <div 
                            key={file.id}
                            className="bg-gray-50/50 rounded-3xl p-5 border border-gray-100 group hover:border-blue-100 hover:bg-white transition-all duration-300"
                          >
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {file.previewUrl ? (
                                  <img src={file.previewUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <File className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <h5 className="text-sm font-bold text-gray-900 truncate pr-4">{file.name}</h5>
                                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                                    {file.status === 'completed' ? 'Done' : `${file.progress}%`}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
                                  <span>{formatSize(file.size)}</span>
                                  {file.status === 'uploading' && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {file.estimatedTimeRemaining}s remaining
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${file.progress}%` }}
                                className={cn(
                                  "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                                  file.status === 'completed' ? "bg-emerald-500" : "bg-blue-600"
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {uploadingFiles.every(f => f.status === 'completed') && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-4"
                        >
                          <button 
                            onClick={() => {
                              setIsUploadModalOpen(false);
                              setUploadingFiles([]);
                            }}
                            className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            Complete Upload
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {isCreateFolderModalOpen && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                onClick={() => setIsCreateFolderModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">New Folder</h3>
                  <button 
                    onClick={() => setIsCreateFolderModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="bg-amber-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-amber-100">
                    <Folder className="w-8 h-8 text-amber-400 fill-amber-400" />
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Folder name"
                    className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-amber-400 rounded-xl transition-all outline-none text-sm font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder(newName);
                    }}
                  />
                </div>
                
                <div className="p-6 bg-gray-50 flex justify-end gap-3">
                  <button 
                    onClick={() => setIsCreateFolderModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleCreateFolder(newName)}
                    className="px-6 py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-100 transition-all"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {movingFileIds.length > 0 && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                onClick={() => setMovingFileIds([])}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">Move {movingFileIds.length} item(s) to</h3>
                  <button 
                    onClick={() => setMovingFileIds([])}
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <button
                    onClick={() => handleMoveFiles(movingFileIds, null)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 rounded-2xl transition-colors text-left group"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                      <HardDrive className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">My Drive</p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Root Directory</p>
                    </div>
                  </button>
                  
                  <div className="h-px bg-gray-50 my-2 mx-4" />
                  
                  {files.filter(f => f.type === 'folder' && !movingFileIds.includes(f.id)).map(folder => (
                    <button
                      key={folder.id}
                      onClick={() => handleMoveFiles(movingFileIds, folder.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 rounded-2xl transition-colors text-left group"
                    >
                      <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                        <Folder className="w-5 h-5 text-amber-400 fill-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{folder.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                          {folder.itemCount || 0} items
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="p-6 bg-gray-50 flex justify-end">
                  <button 
                    onClick={() => setMovingFileIds([])}
                    className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  </div>
);
}
