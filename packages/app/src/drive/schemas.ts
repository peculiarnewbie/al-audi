import { ISODateTime } from "effect";
import { filetypes } from "~/utils/filetypes";

export type UploadProgress = { bytes: number; total: number; percent: number };

export type DriveFileMetadata = {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    uploadedAt: ISODateTime;
    shareId?: string;
    quizId?: string;
    tags?: string[];
};

export type RootFolder = {
    id: string;
    name: string;
    parentFolderId?: string | null;
    createdAt: ISODateTime;
    updatedAt: ISODateTime;
};

export type Folder = {
    id: string;
    name: string;
    parentId: string;
    createdAt: ISODateTime;
    updatedAt: ISODateTime;
    fileCount: number;
    tagCount: number;
};

export type ListFilesInput = {
    folderId: string;
    limit?: number;
    offset?: number;
    sortBy?: "name" | "updatedAt";
    sortOrder?: "asc" | "desc";
    filterByType?: "all" | "files" | "folders" | "tags";
};

export type ListFilesResponse = {
    files: Folder[];
    hasMore: boolean;
    limit: number;
};

export type FileUploadRequest = {
    name: string;
    mimeType: string;
    size: number;
    fileData: Blob;
    quizId?: string;
    tags?: string[];
};

export type FileUploadProgress = {
    bytes: number;
    total: number;
    percent: number;
};

export type FileUploadResult = {
    fileId: string;
    name: string;
    mimeType: string;
    size: number;
    uploadedAt: ISODateTime;
    progress?: FileUploadProgress;
};

export type Tag = {
    id: string;
    name: string;
    color: string;
    createdAt: ISODateTime;
};

export type FolderCreateInput = {
    name: string;
    parentId?: string | null;
    tags?: string[];
};

export type FolderUpdateInput = {
    folderId: string;
    name: string;
    tags?: string[];
};

export type FolderDeleteInput = {
    folderId: string;
};

export type FilePreviewRequest = {
    fileId: string;
    size?: number;
};

export type FileDownloadRequest = {
    fileId: string;
    downloadType: "attachment" | "inline";
};

export type FileDeleteRequest = {
    fileId: string;
};

export type SearchQuery = {
    query: string;
    folderId?: string;
    sortBy?: "name" | "updatedAt";
    sortOrder?: "asc" | "desc";
    limit?: number;
};

export type SearchResult = {
    files: Folder[];
    total: number;
};
