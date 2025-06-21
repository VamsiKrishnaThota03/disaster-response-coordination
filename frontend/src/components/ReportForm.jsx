import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  useColorModeValue,
  FormHelperText,
  InputGroup,
  InputLeftElement,
  Icon,
  Text,
  Divider,
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

      if (formData.image_url && !isValidUrl(formData.image_url)) {
        throw new Error('Invalid image URL');
      }

      const priority = getContentPriority(formData.content);

      const response = await fetch(`${BACKEND_URL}/api/disasters/${disasterId}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          priority,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'content') {
      setWordCount(value.trim().split(/\s+/).filter(Boolean).length);
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
        lowercaseContent.includes('immediate')) {
      return 'high';
    }
    return 'normal';
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
            placeholder="Describe the situation or provide updates..."
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

        <Divider />

        <FormControl>
          <FormLabel color={labelColor}>Image URL (Optional)</FormLabel>
          <InputGroup>
            <InputLeftElement>
              <Icon as={FaImage} color="gray.500" />
            </InputLeftElement>
            <Input
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              placeholder="Enter URL of related image"
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
          </InputGroup>
          <FormHelperText>
            Add an image URL to provide visual context
          </FormHelperText>
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