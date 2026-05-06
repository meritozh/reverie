import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import matter from "gray-matter"
import { listFiles, createFile, deleteFile, type ContentFile } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { FileText, Code2, Plus, Trash2 } from "lucide-react"

export default function DashboardPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<ContentFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const loadFiles = () => {
    listFiles()
      .then((data) => setFiles(data.filter((f) => f.type !== "directory")))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadFiles()
  }, [])

  const handleCreate = async () => {
    const slug = newTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    const path = `posts/${slug}.mdx`
    const content = matter.stringify("", {
      title: newTitle,
      date: new Date().toISOString().split("T")[0],
      status: "draft",
    })
    await createFile(path, content)
    setShowCreateDialog(false)
    setNewTitle("")
    navigate(`/editor/posts/${slug}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteFile(deleteTarget)
    setDeleteTarget(null)
    loadFiles()
  }

  if (loading) {
    return <div className="p-4 text-muted-foreground">Loading files...</div>
  }

  return (
    <main className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Content Files</h2>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Post
        </Button>
      </div>
      {files.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          <p>No files yet.</p>
          <p className="text-sm mt-1">
            Add .mdx or .tsx files to your content/ directory.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <ContextMenu key={file.path}>
                <ContextMenuTrigger>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      const slug = file.path.replace(/\.(mdx|tsx)$/, "")
                      if (file.type === "tsx") {
                        navigate(`/component-editor/${slug}`)
                      } else {
                        navigate(`/editor/${slug}`)
                      }
                    }}
                  >
                    <TableCell className="font-medium flex items-center gap-2">
                      {file.type === "mdx" ? (
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Code2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      {file.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.path}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{file.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(file.modified).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    variant="destructive"
                    onClick={() => setDeleteTarget(file.path)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Post title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!newTitle.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{deleteTarget}"? This action cannot
            be undone.
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
