import { useState, useEffect } from 'react';
import {
  VStack,
  Text,
  Box,
  Badge,
  Spinner,
  Icon,
  HStack,
  useColorModeValue,
  Image,
  Flex,
  Link,
  Divider,
} from '@chakra-ui/react';
import { FaImage, FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa';
import { MdAccessTime, MdPriorityHigh } from 'react-icons/md';
import { BACKEND_URL } from '../config';

const ReportCard = ({ report }) => {
  const cardBg = useColorModeValue('gray.800', 'gray.800');
  const borderColor = useColorModeValue('gray.700', 'gray.700');
  const textColor = useColorModeValue('gray.100', 'gray.100');
  const metaColor = useColorModeValue('gray.400', 'gray.400');

  const getVerificationIcon = (status) => {
    switch (status) {
      case 'verified':
        return FaCheckCircle;
      case 'rejected':
        return FaTimesCircle;
      default:
        return FaHourglassHalf;
    }
  };

  const getVerificationColor = (status) => {
    switch (status) {
      case 'verified':
        return 'green.500';
      case 'rejected':
        return 'red.500';
      default:
        return 'orange.500';
    }
  };

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      bg={cardBg}
      borderColor={borderColor}
      transition="all 0.2s"
      _hover={{ 
        transform: 'translateY(-2px)', 
        shadow: 'dark-lg',
        borderColor: 'gray.600'
      }}
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Box>
            <Text color={textColor} fontSize="sm" fontWeight="medium">
              {report.content}
            </Text>
            <Text fontSize="xs" color={metaColor} mt={1}>
              {new Date(report.created_at).toLocaleString()}
            </Text>
          </Box>
          <Badge 
            colorScheme={report.priority === 'high' ? 'red' : 'blue'}
            variant="solid"
            borderRadius="full"
          >
            {report.priority}
          </Badge>
        </HStack>

        {report.image_url && (
          <Box
            borderRadius="md"
            overflow="hidden"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Image src={report.image_url} alt="Report image" />
          </Box>
        )}

        <HStack spacing={2}>
          <Icon 
            as={getVerificationIcon(report.verification_status)} 
            color={getVerificationColor(report.verification_status)}
          />
          <Text fontSize="xs" color={metaColor}>
            {report.verification_status.charAt(0).toUpperCase() + 
             report.verification_status.slice(1)}
          </Text>
        </HStack>
      </VStack>
    </Box>
  );
};

const Reports = ({ disasterId }) => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/disasters/${disasterId}/reports`);
        if (!response.ok) {
          throw new Error('Failed to fetch reports');
        }
        const data = await response.json();
        setReports(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (disasterId) {
      fetchReports();
    }
  }, [disasterId]);

  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner size="lg" color="blue.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box textAlign="center" py={8} color="red.500">
        <Text>Error: {error}</Text>
      </Box>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Box
        textAlign="center"
        py={8}
        px={4}
        borderWidth="1px"
        borderRadius="lg"
        borderStyle="dashed"
      >
        <Text color="gray.500">No reports available for this disaster yet.</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </VStack>
  );
};

export default Reports; 