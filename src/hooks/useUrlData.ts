import { useState, useEffect, useRef } from 'react';
import { parseDataFromUrl } from '../utils/parseDataFromUrl';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { v4 as uuidv4 } from "uuid";
import { UploadRef } from 'antd/es/upload/Upload';

/**
 * Interface definition for URL data
 */
export interface UrlData {
  text: string;
  images: string[];
  type: string;
}

interface UseUrlDataReturn {
  status: boolean;
  type: string;
  text: string;
}

interface Iprops {
  append?: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => void;
  handleGetFile?: (file: File) => void;
  uploadRef?: React.RefObject<UploadRef>;
}
/**
 * Custom Hook for parsing and managing URL data
 * @returns {UseUrlDataReturn} Object containing data, loading state, and error information
 */
export function useUrlData(props?: Iprops): UseUrlDataReturn {
  const [data, setData] = useState<UrlData>({ text: '', images: [], type: '' });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { append, handleGetFile } = props || {};
  const typeRef = useRef<string>('');
  const loadingRef = useRef<boolean>(false);

  const processUrlData = async () => {
    try {
      const parsedData = parseDataFromUrl();
      const { text, images, type } = parsedData;

      typeRef.current = type;
      loadingRef.current = false;

      if (type === "chat" && text) {
        setIsLoading(true);
        loadingRef.current = true;

        const currentAttachments = await Promise.all(
          images.map(async (imageUrl) => {
            const id = uuidv4();
            return {
              id,
              name: id,
              type: "image",
              localUrl: imageUrl,
              contentType: "image/png",
              url: imageUrl,
            };
          })
        );

        append &&
          append(
            {
              role: "user",
              content: text,
            },
            {
              experimental_attachments: currentAttachments,
            }
          );

        setData(parsedData);
      } else if (type === "sketch") {
        loadingRef.current = true;
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to parse URL data')
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleUrlChange = () => {
      processUrlData();
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event('urlchange'));
      return result;
    };

    history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('urlchange'));
      return result;
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('urlchange', handleUrlChange);

    handleUrlChange();

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('urlchange', handleUrlChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [append, handleGetFile]);

  return { status: loadingRef.current, type: typeRef.current, text: data.text };
}

/**
 * Get Blob object from image URL
 * @param imageUrl URL address of the image
 * @returns Promise<Blob> Returns the image's Blob object
 */
async function getImageBlobFromUrl(imageUrl: string): Promise<Blob> {
  try {
    // Initiate fetch request to get the image
    const response = await fetch(imageUrl, {
      method: 'GET',
      // Add CORS support
      mode: 'cors',
    });

    // Check if request was successful
    if (!response.ok) {
      throw new Error(`Failed to fetch image`);
    }

    // Convert response to Blob object
    const imageBlob = await response.blob();
    return imageBlob;
  } catch (error) {
    console.error('Error getting image Blob:', error);
    throw error;
  }
}