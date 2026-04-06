import { useState, useMemo, useCallback } from "react";
import type { CloudFile, Account } from "@/types";

const INITIAL_FILES: CloudFile[] = [
  {
    id: "1",
    name: "Project Roadmap.pdf",
    size: 2400000,
    type: "pdf",
    lastModified: "2024-03-20T10:30:00Z",
    ownerId: "acc_a",
    thumbnailUrl: "https://picsum.photos/seed/pdf/400/400",
    isShared: true,
  },
  {
    id: "2",
    name: "Design Assets",
    size: 0,
    type: "folder",
    lastModified: "2024-03-19T15:45:00Z",
    ownerId: "acc_a",
    itemCount: 24,
  },
  {
    id: "3",
    name: "Vacation Photos",
    size: 0,
    type: "folder",
    lastModified: "2024-03-18T09:12:00Z",
    ownerId: "acc_b",
    itemCount: 156,
  },
  {
    id: "4",
    name: "Budget_2024.xlsx",
    size: 1200000,
    type: "doc",
    lastModified: "2024-03-21T14:20:00Z",
    ownerId: "acc_b",
    thumbnailUrl: "https://picsum.photos/seed/doc/400/400",
    isShared: true,
  },
  {
    id: "5",
    name: "profile-pic.jpg",
    size: 850000,
    type: "image",
    lastModified: "2024-03-15T11:00:00Z",
    ownerId: "acc_c",
    thumbnailUrl: "https://picsum.photos/seed/profile/400/400",
    isShared: true,
  },
  {
    id: "6",
    name: "source-code.zip",
    size: 15600000,
    type: "archive",
    lastModified: "2024-03-22T16:40:00Z",
    ownerId: "acc_c",
  },
  {
    id: "7",
    name: "Logo_Final.png",
    size: 450000,
    type: "image",
    lastModified: "2024-03-23T10:00:00Z",
    ownerId: "acc_a",
    parentId: "2",
    thumbnailUrl: "https://picsum.photos/seed/logo/400/400",
  },
  {
    id: "8",
    name: "Brand_Guidelines.pdf",
    size: 5600000,
    type: "pdf",
    lastModified: "2024-03-23T11:30:00Z",
    ownerId: "acc_a",
    parentId: "2",
    thumbnailUrl: "https://picsum.photos/seed/brand/400/400",
  },
  {
    id: "9",
    name: "Beach.jpg",
    size: 1200000,
    type: "image",
    lastModified: "2024-03-24T14:00:00Z",
    ownerId: "acc_b",
    parentId: "3",
    thumbnailUrl: "https://picsum.photos/seed/beach/400/400",
  },
];

interface UseFilesOptions {
  accounts: Account[];
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

export function useFiles({ accounts, onToast }: UseFilesOptions) {
  const [files, setFiles] = useState<CloudFile[]>(INITIAL_FILES);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "size" | "lastModified">(
    "lastModified",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileIds[0]),
    [files, selectedFileIds],
  );

  const breadcrumbs = useMemo(() => {
    const crumbs: CloudFile[] = [];
    let currentId = currentFolderId;
    while (currentId) {
      const folder = files.find((f) => f.id === currentId);
      if (folder) {
        crumbs.unshift(folder);
        currentId = folder.parentId || null;
      } else {
        break;
      }
    }
    return crumbs;
  }, [files, currentFolderId]);

  const getProcessedFiles = useCallback(
    (activeTab: "drive" | "monitoring" | "recent" | "shared" | "trash") => {
      let result = files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      if (activeTab === "trash") {
        result = result.filter((f) => f.isDeleted);
      } else if (activeTab === "recent") {
        result = result.filter((f) => !f.isDeleted && f.type !== "folder");
        result.sort(
          (a, b) =>
            new Date(b.lastModified).getTime() -
            new Date(a.lastModified).getTime(),
        );
        return result.slice(0, 20);
      } else if (activeTab === "shared") {
        result = result.filter((f) => !f.isDeleted && f.isShared);
      } else {
        result = result.filter(
          (f) => !f.isDeleted && f.parentId === (currentFolderId || undefined),
        );
      }

      result.sort((a, b) => {
        let comparison = 0;
        if (sortField === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === "size") {
          comparison = a.size - b.size;
        } else if (sortField === "lastModified") {
          comparison =
            new Date(a.lastModified).getTime() -
            new Date(b.lastModified).getTime();
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });

      return result;
    },
    [files, searchQuery, sortField, sortDirection, currentFolderId],
  );

  const handleFolderDoubleClick = useCallback((file: CloudFile) => {
    if (file.type === "folder" && !file.isDeleted) {
      setCurrentFolderId(file.id);
      setSelectedFileIds([]);
    }
  }, []);

  const toggleFileSelection = useCallback(
    (fileId: string, isMulti: boolean) => {
      if (isMulti) {
        setSelectedFileIds((prev) =>
          prev.includes(fileId)
            ? prev.filter((id) => id !== fileId)
            : [...prev, fileId],
        );
      } else {
        setSelectedFileIds([fileId]);
      }
    },
    [],
  );

  const handleMoveToTrash = useCallback(
    (fileIds: string[]) => {
      setFiles((prev) =>
        prev.map((f) =>
          fileIds.includes(f.id) ? { ...f, isDeleted: true } : f,
        ),
      );
      onToast(`${fileIds.length} item(s) moved to trash`, "info");
      setSelectedFileIds([]);
    },
    [onToast],
  );

  const handleRestoreFiles = useCallback(
    (fileIds: string[]) => {
      setFiles((prev) =>
        prev.map((f) =>
          fileIds.includes(f.id) ? { ...f, isDeleted: false } : f,
        ),
      );
      onToast(`${fileIds.length} item(s) restored`, "success");
      setSelectedFileIds([]);
    },
    [onToast],
  );

  const handlePermanentDelete = useCallback(
    (fileIds: string[]) => {
      setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
      onToast(`${fileIds.length} item(s) deleted permanently`, "success");
      setSelectedFileIds([]);
    },
    [onToast],
  );

  const handleRenameFile = useCallback(
    (fileId: string, newName: string) => {
      if (!newName.trim()) return;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                name: newName.trim(),
                lastModified: new Date().toISOString(),
              }
            : f,
        ),
      );
      onToast(`Renamed to ${newName}`, "success");
    },
    [onToast],
  );

  const handleCreateFolder = useCallback(
    (folderName: string) => {
      if (!folderName.trim()) return;
      const newFolder: CloudFile = {
        id: Math.random().toString(36).substring(2, 9),
        name: folderName.trim(),
        size: 0,
        type: "folder",
        lastModified: new Date().toISOString(),
        ownerId: accounts[Math.floor(Math.random() * accounts.length)].id,
        parentId: currentFolderId || undefined,
        itemCount: 0,
      };
      setFiles((prev) => [newFolder, ...prev]);
      onToast(`Folder "${folderName}" created`, "success");
    },
    [accounts, currentFolderId, onToast],
  );

  const handleMoveFiles = useCallback(
    (fileIds: string[], targetFolderId: string | null) => {
      if (fileIds.some((id) => id === targetFolderId)) {
        onToast("Cannot move a folder into itself", "error");
        return;
      }

      setFiles((prev) =>
        prev.map((f) =>
          fileIds.includes(f.id)
            ? {
                ...f,
                parentId: targetFolderId || undefined,
                lastModified: new Date().toISOString(),
              }
            : f,
        ),
      );
      const targetFolder = targetFolderId
        ? files.find((f) => f.id === targetFolderId)
        : { name: "My Drive" };
      onToast(
        `${fileIds.length} item(s) moved to ${targetFolder?.name}`,
        "success",
      );
      setSelectedFileIds([]);
    },
    [files, onToast],
  );

  const addFiles = useCallback((newFiles: CloudFile[]) => {
    setFiles((prev) => [...newFiles, ...prev]);
  }, []);

  const handleSort = useCallback(
    (field: "name" | "size" | "lastModified") => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField],
  );

  return {
    files,
    selectedFileIds,
    selectedFile,
    currentFolderId,
    breadcrumbs,
    sortField,
    sortDirection,
    searchQuery,
    setSearchQuery,
    setCurrentFolderId,
    setSelectedFileIds,
    getProcessedFiles,
    handleFolderDoubleClick,
    toggleFileSelection,
    handleMoveToTrash,
    handleRestoreFiles,
    handlePermanentDelete,
    handleRenameFile,
    handleCreateFolder,
    handleMoveFiles,
    addFiles,
    handleSort,
  };
}

export default useFiles;
