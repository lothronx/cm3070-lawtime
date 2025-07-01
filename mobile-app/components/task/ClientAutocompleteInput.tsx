import React, { useState, useEffect, forwardRef, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { TextInput, Text, Card } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
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
  clients?: Client[];
  onSubmitEditing?: () => void;
}

const ClientAutocompleteInput = forwardRef<any, ClientAutocompleteInputProps>(
  ({ control, name, error, clients = MOCK_CLIENTS, onSubmitEditing }, ref) => {
    const { theme } = useAppTheme();
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);

    const sanitizeInput = (text: string): string => {
      // Remove potentially dangerous characters
      return text
        .replace(/[<>"'&;`\\|{}[\]]/g, "") // Remove HTML/SQL injection chars
        .replace(/[\r\n\t]/g, "") // Remove line breaks and tabs
        .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width chars
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars
        .replace(/\s+/g, " ") // Normalize remaining whitespace
        .trim();
    };

    const filterClients = useCallback(
      (query: string) => {
        if (!query) {
          setFilteredClients(clients);
          return;
        }

        const filtered = clients.filter((client) =>
          client.client_name.toLowerCase().includes(query.toLowerCase())
        );

        setFilteredClients(filtered);
      },
      [clients]
    );

    useEffect(() => {
      filterClients(searchQuery);
    }, [searchQuery, clients, filterClients]);

    const {
      field: { onChange, onBlur, value }
    } = useController({
      control,
      name
    });

    const hasError = Boolean(error);

    return (
      <View style={styles.container}>
        <View>
          <TextInput
            label="Client"
            value={value || null}
            onChangeText={(text) => {
              onChange(text);
              setShowDropdown(true);
              setSearchQuery(text);
            }}
            onFocus={() => {
              setShowDropdown(true);
              setSearchQuery(value || "");
              filterClients(value || "");
            }}
            onBlur={() => {
              // Handle null/empty gracefully for database
              const sanitized = value?.trim() ? sanitizeInput(value) : null;
              onChange(sanitized);
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
            onSubmitEditing={onSubmitEditing}
            ref={ref}
            style={{
              backgroundColor: theme.colors.surface,
            }}
            right={
              showDropdown && filteredClients.length > 0 ? (
                <TextInput.Icon icon="chevron-down" />
              ) : null
            }
          />

          {showDropdown && filteredClients.length > 0 && (
            <Card style={[styles.dropdown, { backgroundColor: theme.colors.surface }]}>
              <ScrollView
                style={styles.dropdownList}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}>
                {filteredClients.map((item) => (
                  <Pressable
                    key={item.id.toString()}
                    style={styles.dropdownItem}
                    onPress={() => {
                      onChange(item.client_name);
                      setShowDropdown(false);
                      setSearchQuery(item.client_name);
                    }}>
                    <Text style={styles.clientName}>{item.client_name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Card>
          )}
        </View>

        {hasError && error?.message && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error.message}</Text>
        )}
      </View>
    );
  }
);

ClientAutocompleteInput.displayName = "ClientAutocompleteInput";

export default ClientAutocompleteInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
    zIndex: 2000,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: BORDER_RADIUS.md,
    elevation: 4,
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
  },
  clientName: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});
