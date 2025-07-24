import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { Layout } from "~/components/layout";
import { ActionBar } from "~/components/layout";
import { StorageIcon, UploadIcon, DownloadIcon } from "~/components/ui/Icons";
import { S3Service } from "~/lib/s3-service";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useSession } from "~/lib/auth-client";

// Query options for fetching S3 bucket list
const bucketsQueryOptions = () => ({
  queryKey: ["s3", "buckets"],
  queryFn: async () => {
    try {
      const s3Service = new S3Service();
      const result = await s3Service.listBuckets();
      return result.Buckets || [];
    } catch (error) {
      console.error("Error fetching S3 buckets:", error);
      return [];
    }
  },
});

// Query options for fetching objects in a bucket
const objectsQueryOptions = (bucket: string) => ({
  queryKey: ["s3", "objects", bucket],
  queryFn: async () => {
    try {
      const s3Service = new S3Service(bucket);
      const result = await s3Service.listObjects();
      return result.Contents || [];
    } catch (error) {
      console.error(`Error fetching objects from bucket ${bucket}:`, error);
      return [];
    }
  },
});

// Component for displaying bucket contents
const BucketContents: React.FC<{ bucketName: string }> = ({ bucketName }) => {
  const { data: objects = [] } = useSuspenseQuery(objectsQueryOptions(bucketName));
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null);
  const s3Service = new S3Service(bucketName);

  const handleDownload = async (key: string) => {
    try {
      const result = await s3Service.downloadFile(key);
      if (!result.Body) {
        throw new Error("No file content received");
      }
      
      // Create a download link
      let blob;
      if ('transformToBlob' in result.Body) {
        blob = await (result.Body as any).transformToBlob();
      } else if (result.Body instanceof Blob) {
        blob = result.Body;
      } else {
        // Handle Node.js Readable stream
        const chunks: Uint8Array[] = [];
        for await (const chunk of result.Body as any) {
          chunks.push(chunk);
        }
        blob = new Blob(chunks);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = key.split("/").pop() || key;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(`Error downloading file ${key}:`, error);
      alert(`Failed to download file: ${error}`);
    }
  };

  // Format the file size to a readable format
  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  // Format the last modified date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (objects.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
        <StorageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No files found in this bucket</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Upload a file to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Modified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {objects.map((object: any) => (
              <tr
                key={object.Key}
                onClick={() => setSelectedFile(object.Key)}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                  selectedFile === object.Key ? "bg-gray-50 dark:bg-gray-800" : ""
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">
                    {object.Key}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(object.LastModified)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(object.Size)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(object.Key);
                    }}
                    className="text-primary hover:text-secondary ml-3"
                  >
                    <DownloadIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function StoragePage() {
  const { data: session } = useSession();
  const [selectedBucket, setSelectedBucket] = React.useState<string>("");
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Get environment variable for bucket name
  const defaultBucket = process.env.AWS_S3_BUCKET || "";
  
  // Fetch buckets
  const { data: buckets = [] } = useSuspenseQuery(bucketsQueryOptions());

  React.useEffect(() => {
    // Select the default bucket from environment variable if available
    if (defaultBucket && buckets.some((b: any) => b.Name === defaultBucket)) {
      setSelectedBucket(defaultBucket);
    } else if (buckets.length > 0 && buckets[0].Name) {
      setSelectedBucket(buckets[0].Name);
    }
  }, [buckets, defaultBucket]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBucket) return;

    try {
      setIsUploading(true);
      const s3Service = new S3Service(selectedBucket);
      
      // Read the file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Upload the file to S3
      const key = `uploads/${file.name}`;
      await s3Service.uploadFile(key, buffer, file.type);
      
      // Invalidate the query to refresh the file list
      window.location.reload();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert(`Failed to upload file: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  const actionBar = (
    <ActionBar
      primaryAction={{
        label: "Upload File",
        icon: <UploadIcon className="w-4 h-4" />,
        onClick: () => fileInputRef.current?.click(),
        primary: true,
      }}
    />
  );

  return (
    <Layout actionBarContent={actionBar}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Storage</h1>
        </div>

        {/* Bucket selector */}
        {buckets.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Bucket
            </label>
            <select
              className="w-full md:w-64 h-10 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-base text-gray-900 dark:text-gray-200 bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20"
              value={selectedBucket}
              onChange={(e) => setSelectedBucket(e.target.value)}
            >
              <option value="">Select a bucket</option>
              {buckets.map((bucket: any) => (
                <option key={bucket.Name} value={bucket.Name}>
                  {bucket.Name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Loading state */}
        {isUploading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Uploading...</p>
          </div>
        )}

        {/* Bucket contents */}
        {!isUploading && selectedBucket && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Bucket Contents: {selectedBucket}</h2>
            <React.Suspense
              fallback={
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading files...</p>
                </div>
              }
            >
              <BucketContents bucketName={selectedBucket} />
            </React.Suspense>
          </div>
        )}

        {buckets.length === 0 && (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            <StorageIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">No S3 buckets found</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 mb-4">
              Make sure your AWS credentials are correctly configured
            </p>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-4 max-w-lg mx-auto text-left">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mb-2">
                # Set environment variables for AWS access
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                AWS_ACCESS_KEY_ID=your_access_key
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                AWS_SECRET_ACCESS_KEY=your_secret_key
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                AWS_REGION=us-east-1
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                AWS_S3_BUCKET=your_bucket_name
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export const Route = createFileRoute("/storage/")({
  component: StoragePage,
});