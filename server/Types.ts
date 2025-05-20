import { Request } from "express"
import { Collection, Db, MongoClient, WithId, Document } from "mongodb"

export type RouteRequest = Request & {
    body: { [key: string]: string },
    session?: { user?: string }
}

export type StrictRouteRequest = Request & {
    body: { [key: string]: string },
    session: { user: string }
}

export type Database = {
    uri: string,
    client: MongoClient,
    databases: {[key: string]: Db},
    collections: {
        users: Collection<UserData>,
        sessions: Collection,
        catalog: Collection<ModData>,
        comments: Collection<CommentData>
    },
    methods: {
        signup(email: string, username: string, password: string): RouteMethodReturn
        GetUserFromUsername(username: string): Promise<WithId<Document & UserData> | null>,
        getUser(id: string): Promise<WithId<Document & UserData> | null>
        GetMod(id: string): Promise<WithId<Document & ModData> | null>
        GetRelease(modId: string, tag: string): Promise<ReleaseData | null>,
        login(req: StrictRouteRequest, username: string, password: string): RouteMethodReturn
        submit(req: StrictRouteRequest, name: string, description: string, icon: string, dependencies: [{ id: string, tag: string }], source_code: string, github_release_link: string): RouteMethodReturn
        ChangeModApprovalStatus(req: StrictRouteRequest, id: string, status: boolean, reason?: string): RouteMethodReturn
        ChangeModReleaseApprovalStatus(req: StrictRouteRequest, id: string, tag: string, status: boolean, reason?: string): RouteMethodReturn
        GetModQueue(req: StrictRouteRequest): RouteMethodReturn
        SubmissionBan(req: StrictRouteRequest, id: string, status: boolean): RouteMethodReturn
        ChangeModSettings(req: StrictRouteRequest, modId: string, settings: { name?: string, description?: string, icon?: string }): RouteMethodReturn
        UpdateReleaseSettings(req: StrictRouteRequest, modId: string, tag: string): RouteMethodReturn,
        ArchiveMod(req: StrictRouteRequest, id: string): RouteMethodReturn,
        ModDownload(id: string, tag: string): Promise<void>,
        GetSearch(page: number, query?: string, sorting?: "downloads" | "favorites"): Promise<
            {success: boolean, mods?: Document[] | WithId<{ success: boolean, mods: [ModData] }>}
        >,
        Comment(req: StrictRouteRequest, mod: string, comment: string): RouteMethodReturn
    },
    init(): Promise<void>
}

export type RouteMethodReturn = Promise<{status: number, response: {success: boolean, message: string}}>

export type UserData = {
    email: string,
    username: string,
    password: string,
    createdAt: number,
    verified: boolean,
    submission_ban: boolean,
    level: number
}

export type ModData = {
    name: string,
    description: string,
    icon: string,
    author: string,
    source_code: string,
    updateApprovalPending: boolean,
    approved: boolean,
    reviewed: boolean,
    moderationReason: string | null,
    archived: boolean,
    downloads: number,
    favorites: number,
    releases: ReleaseData[]
}

export type ReleaseData = {
    name: string,
    body: string,
    tag: string,
    url: string,
    download: string,
    dependencies: [{ id: string, tag: string }],
    created_at: string,
    checksum: string,
    approved: boolean,
    reviewed: boolean,
    moderationReason: string | null
}

export type CommentData = {
    author: string,
    mod: string,
    content: string,
    created_at: number
}