import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Textarea,
  VStack,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  useColorModeValue,
  Spinner,
  Text,
  Badge,
  HStack,
} from '@chakra-ui/react';
import { FaImage, FaFileAlt, FaExclamationTriangle } from 'react-icons/fa';

const BACKEND_URL = 'http://localhost:3001';

const ReportForm = ({ disasterId, onReportSubmitted }) => {
  const [formData, setFormData] = useState({
    content: '',
    image_url: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageVerification, setImageVerification] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const toast = useToast();

  // Dark mode colors
  const bgColor = useColorModeValue('gray.800', 'gray.800');
  const borderColor = useColorModeValue('gray.700', 'gray.700');
  const labelColor = useColorModeValue('gray.100', 'gray.100');
  const inputBg = useColorModeValue('gray.700', 'gray.700');
  const inputColor = useColorModeValue('white', 'white');
  const placeholderColor = useColorModeValue('gray.400', 'gray.400');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form data
      if (!formData.content.trim()) {
        throw new Error('Report content is required');
      }

      // If image URL is provided but not verified, verify it first
      if (formData.image_url && !imageVerification) {
        await verifyImage();
      }

      const response = await fetch(`${BACKEND_URL}/api/disasters/${disasterId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          verification_status: imageVerification?.status || 'pending',
          priority: getContentPriority(formData.content),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to submit report');
      }

      toast({
        title: 'Report Submitted',
        description: 'Your report has been successfully recorded.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setFormData({ content: '', image_url: '' });
      setImageVerification(null);
      onReportSubmitted();
    } catch (error) {
      setError(error.message);
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyImage = async () => {
    if (!formData.image_url || !isValidUrl(formData.image_url)) {
      toast({
        title: 'Invalid Image URL',
        description: 'Please provide a valid image URL',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/disasters/${disasterId}/verify-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: formData.image_url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify image');
      }

      setImageVerification(data);
      
      toast({
        title: 'Image Verified',
        description: `Status: ${data.status} (${data.confidence})`,
        status: data.status === 'VERIFIED' ? 'success' : 'warning',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Verification Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'content') {
      setWordCount(value.trim().split(/\s+/).filter(Boolean).length);
    }

    // Reset image verification when URL changes
    if (name === 'image_url') {
      setImageVerification(null);
    }
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const getContentPriority = (content) => {
    const lowercaseContent = content.toLowerCase();
    if (lowercaseContent.includes('urgent') || 
        lowercaseContent.includes('emergency') || 
        lowercaseContent.includes('critical')) {
      return 'high';
    }
    return 'normal';
  };

  const getVerificationBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED': return 'green';
      case 'SUSPICIOUS': return 'orange';
      case 'UNVERIFIED': return 'red';
      default: return 'gray';
    }
  };

  return (
    <Box 
      as="form" 
      onSubmit={handleSubmit} 
      bg={bgColor}
      borderRadius="md" 
      borderWidth="1px"
      borderColor={borderColor}
      p={6}
    >
      <VStack spacing={4}>
        {error && (
          <Alert status="error" borderRadius="md" bg="red.900" color="white">
            <AlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FormControl isRequired>
          <FormLabel color={labelColor}>Report Content</FormLabel>
          <Textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Describe the situation or provide updates"
            rows={4}
            bg={inputBg}
            color={inputColor}
            borderColor={borderColor}
            _placeholder={{ color: placeholderColor }}
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ 
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
            }}
          />
          <HStack justify="space-between" mt={2}>
            <FormHelperText>
              Be clear and specific about the situation
            </FormHelperText>
            <HStack spacing={2}>
              <Text fontSize="sm" color="gray.500">
                {wordCount} words
              </Text>
              {formData.content && (
                <Badge
                  colorScheme={getContentPriority(formData.content) === 'high' ? 'red' : 'blue'}
                  variant="subtle"
                >
                  {getContentPriority(formData.content) === 'high' ? (
                    <HStack spacing={1}>
                      <Icon as={FaExclamationTriangle} />
                      <Text>Urgent</Text>
                    </HStack>
                  ) : 'Normal'}
                </Badge>
              )}
            </HStack>
          </HStack>
        </FormControl>

        <FormControl>
          <FormLabel color={labelColor}>Image URL</FormLabel>
          <HStack>
            <Input
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              placeholder="Enter URL of the image"
              bg={inputBg}
              color={inputColor}
              borderColor={borderColor}
              _placeholder={{ color: placeholderColor }}
              _hover={{ borderColor: 'gray.600' }}
              _focus={{ 
                borderColor: 'blue.500',
                boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)'
              }}
            />
            <Button
              onClick={verifyImage}
              isLoading={isVerifying}
              loadingText="Verifying"
              colorScheme="blue"
              size="md"
              isDisabled={!formData.image_url || !isValidUrl(formData.image_url)}
            >
              Verify
            </Button>
          </HStack>
          {imageVerification && (
            <Box mt={2}>
              <Badge 
                colorScheme={getVerificationBadgeColor(imageVerification.status)}
                px={2}
                py={1}
                borderRadius="full"
              >
                {imageVerification.status} ({imageVerification.confidence})
              </Badge>
              {imageVerification.analysis && (
                <Text fontSize="sm" color="gray.400" mt={1}>
                  {imageVerification.analysis}
                </Text>
              )}
            </Box>
          )}
        </FormControl>

        <Button
          type="submit"
          colorScheme="blue"
          width="full"
          isLoading={isLoading}
          loadingText="Submitting..."
          _hover={{
            transform: 'translateY(-1px)',
            shadow: 'lg'
          }}
        >
          Submit Report
        </Button>
      </VStack>
    </Box>
  );
};

export default ReportForm; 