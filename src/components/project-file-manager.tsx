'use client';

import { useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Download, 
  Upload, 
  FolderOpen as FolderOpenIcon, 
  MoreHorizontal,
  Eye,
  Trash2,
  Edit,
  File,
  Image,
  FileSpreadsheet,
  Archive
} from 'lucide-react';
import { uploadProjectFile, deleteProjectFile } from '@/app/(authenticated)/admin/admin-project-actions';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/hooks/use-auth';

interface FileItem {
  fileName: string;
  fileUrl: string;
  filePath?: string;
  size?: number;
  uploadedAt?: string;
  type?: string;
}

interface ProjectFileManagerProps {
  projectId: string;
  files: FileItem[];
  onFilesUpdated?: (files: FileItem[]) => void;
}

export default function ProjectFileManager({ projectId, files = [], onFilesUpdated }: ProjectFileManagerProps) {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter(f => (f.fileName || '').toLowerCase().includes(q));
  }, [files, search]);

  // Get file icon based on extension
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return <Image className="h-5 w-5 text-purple-500" />;
      case 'zip':
      case 'rar':
      case '7z':
        return <Archive className="h-5 w-5 text-orange-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number = 0) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileName) 
        ? prev.filter(f => f !== fileName)
        : [...prev, fileName]
    );
  };

  // Handle file download
  const downloadFile = (file: FileItem) => {
    window.open(file.fileUrl, '_blank');
  };

  // Handle file preview
  const previewFile = (file: FileItem) => {
    window.open(file.fileUrl, '_blank');
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    if (!user?.uid) {
      toast.error('You must be signed in to upload');
      return;
    }

    setIsUploading(true);
    
    try {
      for (const file of Array.from(uploadedFiles)) {
        const result = await uploadProjectFile(projectId, user.uid, file);
        
        if (result.success && result.file) {
          const updatedFiles = [...files, result.file as FileItem];
          onFilesUpdated?.(updatedFiles);
          toast.success(`${result.file.fileName} uploaded successfully`);
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.message}`);
        }
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileName: string) => {
    try {
      const result = await deleteProjectFile(projectId, fileName);
      
      if (result.success) {
        const updatedFiles = files.filter(f => f.fileName !== fileName);
        onFilesUpdated?.(updatedFiles);
        toast.success('File deleted successfully');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  // Handle bulk file deletion
  const handleDeleteSelected = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      for (const fileName of selectedFiles) {
        await deleteProjectFile(projectId, fileName);
      }
      
      const updatedFiles = files.filter(f => !selectedFiles.includes(f.fileName));
      onFilesUpdated?.(updatedFiles);
      setSelectedFiles([]);
      toast.success(`${selectedFiles.length} files deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete selected files');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpenIcon className="h-5 w-5" />
            <CardTitle>Project Files</CardTitle>
            <Badge variant="secondary">{filteredFiles.length} files</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="hidden w-56 md:block"
            />
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? 'Grid View' : 'List View'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <span aria-hidden="true">
              <FolderOpenIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            </span>
            <h3 className="text-lg font-semibold mb-2">No Files Found</h3>
            <p className="text-sm">This project doesn&#39;t have any files uploaded yet.</p>
            <Button 
              className="mt-4" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Upload First File'}
            </Button>
          </div>
        ) : (
          <>
            {selectedFiles.length > 0 && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {selectedFiles.length} file(s) selected
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDeleteSelected}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {viewMode === 'list' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles(filteredFiles.map(f => f.fileName));
                          } else {
                            setSelectedFiles([]);
                          }
                        }}
                        checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.map((file, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.fileName)}
                          onChange={() => toggleFileSelection(file.fileName)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.fileName)}
                          <span className="font-medium">{file.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {file.fileName.split('.').pop()?.toUpperCase() || 'FILE'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString() : '--'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => previewFile(file)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadFile(file)}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <Separator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeleteFile(file.fileName)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredFiles.map((file, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="mb-3">
                        {getFileIcon(file.fileName)}
                      </div>
                      <h4 className="text-sm font-medium truncate mb-1" title={file.fileName}>
                        {file.fileName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
