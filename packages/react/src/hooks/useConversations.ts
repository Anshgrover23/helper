"use client";

import { useMutation, UseMutationOptions, useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import type {
  ConversationDetails,
  ConversationsResult,
  CreateConversationParams,
  CreateConversationResult,
  CreateMessageParams,
  CreateMessageResult,
  UnreadConversationsCountResult,
  UpdateConversationParams,
  UpdateConversationResult,
} from "@helperai/client";
import { useHelperClient } from "../components/helperClientProvider";

export const useConversations = (queryOptions?: Partial<UseQueryOptions<ConversationsResult>>) => {
  const { client } = useHelperClient();
  return useQuery({
    queryKey: ["conversations"],
    queryFn: () => client.conversations.list(),
    ...queryOptions,
  });
};

export const useConversation = (
  slug: string,
  options?: { markRead?: boolean; enableRealtime?: boolean },
  queryOptions?: Partial<UseQueryOptions<ConversationDetails>>,
) => {
  const { client, queryClient } = useHelperClient();

  useEffect(() => {
    if (options?.enableRealtime === false) return;

    const unlisten = client.conversations.listen(slug, {
      onSubjectChanged: (subject) => {
        queryClient.setQueryData(["conversation", slug], (old: ConversationDetails | undefined) => {
          if (!old) return old;
          return { ...old, subject };
        });
      },
    });

    return unlisten;
  }, [client, queryClient, slug, options?.enableRealtime]);

  const query = useQuery({
    queryKey: ["conversation", slug],
    queryFn: () => client.conversations.get(slug, options),
    enabled: !!slug,
    ...queryOptions,
  });

  useEffect(() => {
    if (query.data && options?.markRead !== false)
      queryClient.invalidateQueries({ queryKey: ["conversations", "unread"] });
  }, [queryClient, query.data, options?.markRead]);

  return query;
};

export const useUnreadConversationsCount = (
  queryOptions?: Partial<UseQueryOptions<UnreadConversationsCountResult>>,
) => {
  const { client } = useHelperClient();
  return useQuery({
    queryKey: ["conversations", "unread"],
    queryFn: () => client.conversations.unread(),
    ...queryOptions,
  });
};

export const useCreateConversation = (
  mutationOptions?: Partial<UseMutationOptions<CreateConversationResult, Error, CreateConversationParams>>,
) => {
  const { client, queryClient } = useHelperClient();

  return useMutation({
    mutationFn: (params: CreateConversationParams = {}) => client.conversations.create(params),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      mutationOptions?.onSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
};

export const useUpdateConversation = (
  mutationOptions?: Partial<
    UseMutationOptions<UpdateConversationResult, Error, { slug: string; params: UpdateConversationParams }>
  >,
) => {
  const { client, queryClient } = useHelperClient();

  return useMutation({
    mutationFn: ({ slug, params }: { slug: string; params: UpdateConversationParams }) =>
      client.conversations.update(slug, params),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.slug] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      mutationOptions?.onSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
};

export const useCreateMessage = (
  mutationOptions?: Partial<
    UseMutationOptions<CreateMessageResult, Error, { conversationSlug: string; params: CreateMessageParams }>
  >,
) => {
  const { client, queryClient } = useHelperClient();

  return useMutation({
    mutationFn: ({ conversationSlug, params }: { conversationSlug: string; params: CreateMessageParams }) =>
      client.messages.create(conversationSlug, params),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", variables.conversationSlug] });
      mutationOptions?.onSuccess?.(data, variables, context);
    },
    ...mutationOptions,
  });
};
