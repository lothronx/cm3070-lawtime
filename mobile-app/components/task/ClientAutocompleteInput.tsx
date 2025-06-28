import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { TextInput, Text, Card } from "react-native-paper";
import { Control, Controller, FieldError } from "react-hook-form";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";
import { Database } from "@/types/supabase";

type Client = Database["public"]["Tables"]["clients"]["Row"];

// Mock data for testing
const MOCK_CLIENTS: Client[] = [
  {
    id: 101,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "ACME Corporation",
    created_at: "2025-08-17T09:15:00+08:00",
  },
  {
    id: 102,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "New Horizons LLC",
    created_at: "2025-08-17T22:42:00+08:00",
  },
  {
    id: 103,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "Stellar Industries Inc.",
    created_at: "2025-08-18T10:30:00+08:00",
  },
  {
    id: 104,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "Global Dynamics Corp",
    created_at: "2025-08-18T14:15:00+08:00",
  },
  {
    id: 105,
    user_id: "123e4567-e89b-12d3-a456-426614174000",
    client_name: "Phoenix Enterprises",
    created_at: "2025-08-19T09:45:00+08:00",
  },
];

interface ClientAutocompleteInputProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  clients?: Client[]; // Optional prop to override mock data
}

export default function ClientAutocompleteInput({
  control,
  name,
  error,
  clients = MOCK_CLIENTS,
}: ClientAutocompleteInputProps) {
  const { theme } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  const sanitizeInput = (text: string): string => {
    // Remove potentially dangerous characters and limit length
    return text
      .replace(/[<>'"&;]/g, "") // Remove HTML/SQL injection chars
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim()
      .substring(0, 100); // Limit to 100 characters
  };

  const filterClients = (query: string) => {
    if (!query.trim()) {
      setFilteredClients([]);
      return;
    }

    const filtered = clients
      .filter((client) => client.client_name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5); // Limit to 5 suggestions

    setFilteredClients(filtered);
  };

  useEffect(() => {
    filterClients(searchQuery);
  }, [searchQuery, clients]);

  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name={name}
        rules={{
          required: "Client is required",
          minLength: {
            value: 2,
            message: "Client name must be at least 2 characters",
          },
          maxLength: {
            value: 100,
            message: "Client name must be less than 100 characters",
          },
          validate: (value: string) => {
            const trimmed = value?.trim();
            if (!trimmed) return "Client is required";
            if (trimmed.length < 2) return "Client name must be at least 2 characters";
            return true;
          },
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextInput
              label="Client"
              value={value || ""}
              onChangeText={(text) => {
                const sanitized = sanitizeInput(text);
                onChange(sanitized);
                setSearchQuery(sanitized);
                setShowDropdown(sanitized.length > 0);
              }}
              onFocus={() => {
                setIsFocused(true);
                if (value && value.length > 0) {
                  setShowDropdown(true);
                  setSearchQuery(value);
                }
              }}
              onBlur={() => {
                setIsFocused(false);
                // Delay hiding dropdown to allow selection
                setTimeout(() => {
                  setShowDropdown(false);
                }, 150);
                onBlur();
              }}
              mode="outlined"
              error={hasError}
              multiline={false}
              maxLength={100}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                },
              ]}
              outlineStyle={{
                borderRadius: BORDER_RADIUS.md,
              }}
              theme={{
                colors: {
                  primary: theme.colors.primary,
                  error: theme.colors.error,
                  outline: hasError ? theme.colors.error : theme.colors.outline,
                },
              }}
              right={
                showDropdown && filteredClients.length > 0 ? (
                  <TextInput.Icon icon="chevron-down" />
                ) : null
              }
            />

            {showDropdown && filteredClients.length > 0 && (
              <Card
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}>
                <ScrollView
                  style={styles.dropdownList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}>
                  {filteredClients.map((item) => (
                    <Pressable
                      key={item.id.toString()}
                      style={[
                        styles.dropdownItem,
                        { borderBottomColor: theme.colors.surfaceVariant },
                      ]}
                      onPress={() => {
                        onChange(item.client_name);
                        setShowDropdown(false);
                        setSearchQuery(item.client_name);
                      }}>
                      <Text style={[styles.clientName, { color: theme.colors.onSurface }]}>
                        {item.client_name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </Card>
            )}
          </View>
        )}
      />

      {hasError && error?.message && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error.message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    zIndex: 1000, // Ensure dropdown appears above other elements
  },
  input: {
    fontSize: 16,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    zIndex: 1000,
    maxHeight: 200,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "400",
  },
  errorText: {
    fontSize: 12,
    marginTop: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});
