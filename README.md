# ArtisanPack UI: Livewire Drag and Drop

An accessibility-first drag-and-drop utility for Livewire and Alpine.js applications. Built with WCAG 2.1 AA compliance in mind, featuring full keyboard navigation, screen reader support, and seamless integration with Laravel's TALL stack.

## Features

- 🎯 **Accessibility-First**: Full WCAG 2.1 AA compliance with ARIA attributes and screen reader support
- ⌨️ **Keyboard Navigation**: Complete keyboard control with arrow keys, space/enter, and escape
- 🎨 **Alpine.js Integration**: Native Alpine.js directives for seamless TALL stack integration
- 🔄 **Livewire Compatible**: Custom events for easy Livewire backend integration
- 📱 **Touch Friendly**: Works on desktop, tablet, and mobile devices
- 🎪 **Multiple Use Cases**: Perfect for lists, kanban boards, and complex drag-and-drop interfaces

## Installation

### Via NPM

```bash
npm install @artisanpack-ui/livewire-drag-and-drop
```

### Via CDN

```html
<script src="https://unpkg.com/@artisanpack-ui/livewire-drag-and-drop@latest/dist/livewire-drag-and-drop.js"></script>
```

### Setup with Alpine.js

The package supports two import methods:

#### Method 1: Manual Registration (Recommended)

Gives you full control over plugin initialization.

```javascript
import Alpine from 'alpinejs'
import LivewireDragAndDrop from '@artisanpack-ui/livewire-drag-and-drop'

document.addEventListener('alpine:init', () => {
    LivewireDragAndDrop(Alpine)
})

Alpine.start()
```

#### Method 2: Automatic Registration

Automatically registers when Alpine.js is ready.

```javascript
import Alpine from 'alpinejs'
import '@artisanpack-ui/livewire-drag-and-drop'  // Auto-registers

Alpine.start()
```

#### CDN Setup

```html
<script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
<script defer src="https://unpkg.com/@artisanpack-ui/livewire-drag-and-drop@latest/dist/livewire-drag-and-drop.js"></script>
<script>
document.addEventListener('alpine:init', () => {
    LivewireDragAndDrop(Alpine)
})
</script>
```

## Usage

### Basic CSS Styles

Add these essential CSS styles to your application:

```css
.sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
}

.is-grabbing {
    opacity: 0.7;
    transform: scale(1.02);
    z-index: 1000;
}
```

## Example 1: Simple Reorderable List

This example demonstrates a basic reorderable todo list using Livewire and the drag-and-drop functionality.

### Livewire Component (ReorderableList.php)

```php
<?php

declare( strict_types=1 );

namespace App\Livewire;

use Illuminate\Contracts\View\View;
use Illuminate\Support\Collection;
use Livewire\Attributes\On;
use Livewire\Component;

/**
 * Reorderable List Component
 *
 * A simple todo list component that demonstrates drag-and-drop reordering
 * functionality with full accessibility support and Livewire integration.
 *
 * @since 1.0.0
 */
class ReorderableList extends Component
{
    /**
     * Collection of todo items.
     *
     * @since 1.0.0
     * @var array<int, array<string, mixed>>
     */
    public array $todos = [
        [ 'id' => 1, 'text' => 'Complete project documentation', 'completed' => false ],
        [ 'id' => 2, 'text' => 'Review pull requests', 'completed' => false ],
        [ 'id' => 3, 'text' => 'Update dependencies', 'completed' => true ],
        [ 'id' => 4, 'text' => 'Deploy to production', 'completed' => false ],
        [ 'id' => 5, 'text' => 'Send team updates', 'completed' => false ],
    ];

    /**
     * Handle the reorder event from the drag-and-drop functionality.
     *
     * This method is called when items are reordered via drag-and-drop,
     * either through mouse/touch interaction or keyboard navigation.
     *
     * @since 1.0.0
     *
     * @param int $oldIndex The original position of the item.
     * @param int $newIndex The new position of the item.
     * @return void
     */
    #[On('reorder-todos')]
    public function reorderTodos( int $oldIndex, int $newIndex ): void
    {
        // Validate indices
        if ( $oldIndex < 0 || $oldIndex >= count( $this->todos ) || $newIndex < 0 || $newIndex >= count( $this->todos ) ) {
            return;
        }

        // Remove item from old position
        $item = array_splice( $this->todos, $oldIndex, 1 )[0];

        // Insert item at new position
        array_splice( $this->todos, $newIndex, 0, [ $item ] );

        // Re-index the array to ensure consistency
        $this->todos = array_values( $this->todos );

        // Optional: Persist to database
        // $this->saveTodoOrder();

        // Announce change for screen readers
        $this->dispatch( 'todo-reordered', [
            'message' => sprintf(
                'Todo item "%s" moved from position %d to position %d',
                $item['text'],
                $oldIndex + 1,
                $newIndex + 1
            ),
        ] );
    }

    /**
     * Toggle the completion status of a todo item.
     *
     * @since 1.0.0
     *
     * @param int $index The index of the todo item to toggle.
     * @return void
     */
    public function toggleTodo( int $index ): void
    {
        if ( isset( $this->todos[ $index ] ) ) {
            $this->todos[ $index ]['completed'] = ! $this->todos[ $index ]['completed'];
            
            // Optional: Persist to database
            // $this->saveTodo( $this->todos[ $index ] );
        }
    }

    /**
     * Add a new todo item.
     *
     * @since 1.0.0
     *
     * @param string $text The text content of the new todo.
     * @return void
     */
    public function addTodo( string $text ): void
    {
        if ( empty( trim( $text ) ) ) {
            return;
        }

        $newId = max( array_column( $this->todos, 'id' ) ) + 1;
        $this->todos[] = [
            'id'        => $newId,
            'text'      => trim( $text ),
            'completed' => false,
        ];

        // Optional: Persist to database
        // $this->saveTodo( end( $this->todos ) );
    }

    /**
     * Remove a todo item.
     *
     * @since 1.0.0
     *
     * @param int $index The index of the todo item to remove.
     * @return void
     */
    public function removeTodo( int $index ): void
    {
        if ( isset( $this->todos[ $index ] ) ) {
            // Optional: Remove from database
            // $this->deleteTodo( $this->todos[ $index ]['id'] );
            
            unset( $this->todos[ $index ] );
            $this->todos = array_values( $this->todos );
        }
    }

    /**
     * Render the component.
     *
     * @since 1.0.0
     *
     * @return View The component view.
     */
    public function render(): View
    {
        return view( 'livewire.reorderable-list' );
    }
}
```

### Blade View (resources/views/livewire/reorderable-list.blade.php)

```blade
{{--
/**
 * Reorderable List Component View
 *
 * Displays a drag-and-drop enabled todo list with full accessibility support.
 * Follows ArtisanPack UI styling conventions and WordPress Documentation Standards.
 *
 * @since 1.0.0
 */
--}}

<div class="reorderable-list-container">
    {{-- Component Header --}}
    <div class="reorderable-list-header">
        <h2 class="reorderable-list-title">
            {{ __( 'My Todo List' ) }}
        </h2>
        <p class="reorderable-list-description">
            {{ __( 'Drag items to reorder, or use keyboard navigation (Space/Enter to grab, Arrow keys to move, Space/Enter to drop, Escape to cancel).' ) }}
        </p>
    </div>

    {{-- Add New Todo Form --}}
    <form wire:submit="addTodo($wire.newTodoText)" class="add-todo-form">
        <div class="add-todo-input-group">
            <label for="newTodoText" class="sr-only">
                {{ __( 'Add new todo item' ) }}
            </label>
            <input
                type="text"
                id="newTodoText"
                wire:model="newTodoText"
                placeholder="{{ __( 'Add a new todo item...' ) }}"
                class="add-todo-input"
                maxlength="255"
                required
            >
            <button type="submit" class="add-todo-button">
                <span class="sr-only">{{ __( 'Add todo' ) }}</span>
                <svg class="add-todo-icon" aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    </form>

    {{-- Drag and Drop Todo List --}}
    <div 
        x-data="{
            handleReorder: function(event) {
                const { oldIndex, newIndex } = event.detail;
                if (oldIndex !== newIndex) {
                    $wire.reorderTodos(oldIndex, newIndex);
                }
            }
        }"
        x-drag-context="handleReorder($event.detail)"
        @drag:end="handleReorder($event)"
        class="todo-list"
        role="list"
        aria-label="{{ __( 'Draggable todo list' ) }}"
    >
        @forelse ( $todos as $index => $todo )
            <div
                x-drag-item="{{ json_encode( [ 'id' => $todo['id'], 'index' => $index, 'text' => $todo['text'] ] ) }}"
                class="todo-item {{ $todo['completed'] ? 'todo-item--completed' : '' }}"
                role="listitem"
                aria-describedby="todo-{{ $todo['id'] }}-description"
            >
                {{-- Todo Content --}}
                <div class="todo-item-content">
                    {{-- Drag Handle --}}
                    <div class="todo-drag-handle" aria-hidden="true">
                        <svg class="drag-handle-icon" viewBox="0 0 24 24">
                            <path d="M10 4h4v2h-4V4zm0 7h4v2h-4v-2zm0 7h4v2h-4v-2z" fill="currentColor"/>
                        </svg>
                    </div>

                    {{-- Todo Checkbox --}}
                    <div class="todo-checkbox-container">
                        <input
                            type="checkbox"
                            id="todo-{{ $todo['id'] }}"
                            wire:click="toggleTodo({{ $index }})"
                            {{ $todo['completed'] ? 'checked' : '' }}
                            class="todo-checkbox"
                            aria-describedby="todo-{{ $todo['id'] }}-description"
                        >
                        <label for="todo-{{ $todo['id'] }}" class="todo-checkbox-label">
                            <span class="sr-only">
                                {{ $todo['completed'] ? __( 'Mark as incomplete' ) : __( 'Mark as complete' ) }}
                            </span>
                        </label>
                    </div>

                    {{-- Todo Text --}}
                    <div class="todo-text-container">
                        <span 
                            class="todo-text {{ $todo['completed'] ? 'todo-text--completed' : '' }}"
                            id="todo-{{ $todo['id'] }}-description"
                        >
                            {{ $todo['text'] }}
                        </span>
                        @if ( $todo['completed'] )
                            <span class="sr-only">{{ __( '(completed)' ) }}</span>
                        @endif
                    </div>

                    {{-- Todo Actions --}}
                    <div class="todo-actions">
                        <button
                            type="button"
                            wire:click="removeTodo({{ $index }})"
                            class="todo-remove-button"
                            aria-label="{{ __( 'Remove todo: :todo', [ 'todo' => $todo['text'] ] ) }}"
                        >
                            <svg class="remove-icon" aria-hidden="true" viewBox="0 0 24 24">
                                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {{-- Drag Instructions (Screen Reader Only) --}}
                <div class="sr-only">
                    {{ __( 'Use Space or Enter to grab this item, arrow keys to move, Space or Enter to drop, Escape to cancel.' ) }}
                </div>
            </div>
        @empty
            <div class="empty-state">
                <p class="empty-state-message">
                    {{ __( 'No todos yet. Add one above to get started!' ) }}
                </p>
            </div>
        @endforelse
    </div>

    {{-- Live Region for Announcements --}}
    <div 
        x-data
        @todo-reordered.window="$el.textContent = $event.detail.message"
        class="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
    ></div>
</div>

{{-- Component Styles --}}
<style>
.reorderable-list-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 1.5rem;
    background: #ffffff;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.reorderable-list-header {
    margin-bottom: 1.5rem;
    text-align: center;
}

.reorderable-list-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
}

.reorderable-list-description {
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.5;
}

.add-todo-form {
    margin-bottom: 1.5rem;
}

.add-todo-input-group {
    display: flex;
    gap: 0.5rem;
}

.add-todo-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.add-todo-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.add-todo-button {
    padding: 0.75rem;
    background: #3b82f6;
    border: none;
    border-radius: 0.375rem;
    color: white;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.add-todo-button:hover {
    background: #2563eb;
}

.add-todo-button:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

.add-todo-icon {
    width: 1.25rem;
    height: 1.25rem;
}

.todo-list {
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    overflow: hidden;
}

.todo-item {
    background: #ffffff;
    border-bottom: 1px solid #e5e7eb;
    transition: all 0.15s ease-in-out;
    cursor: grab;
}

.todo-item:last-child {
    border-bottom: none;
}

.todo-item:hover {
    background: #f9fafb;
}

.todo-item:focus-within {
    background: #f0f9ff;
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
}

.todo-item--completed {
    background: #f3f4f6;
    opacity: 0.8;
}

.todo-item-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
}

.todo-drag-handle {
    color: #9ca3af;
    cursor: grab;
}

.drag-handle-icon {
    width: 1.25rem;
    height: 1.25rem;
}

.todo-checkbox-container {
    display: flex;
    align-items: center;
}

.todo-checkbox {
    width: 1.125rem;
    height: 1.125rem;
    border: 2px solid #d1d5db;
    border-radius: 0.25rem;
    cursor: pointer;
}

.todo-checkbox:checked {
    background: #3b82f6;
    border-color: #3b82f6;
}

.todo-checkbox:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.todo-text-container {
    flex: 1;
}

.todo-text {
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
    word-wrap: break-word;
}

.todo-text--completed {
    text-decoration: line-through;
    color: #6b7280;
}

.todo-actions {
    display: flex;
    gap: 0.5rem;
}

.todo-remove-button {
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    border-radius: 0.25rem;
    transition: background-color 0.15s ease-in-out;
}

.todo-remove-button:hover {
    background: #fef2f2;
}

.todo-remove-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.5);
}

.remove-icon {
    width: 1rem;
    height: 1rem;
}

.empty-state {
    padding: 3rem 1rem;
    text-align: center;
}

.empty-state-message {
    color: #6b7280;
    font-style: italic;
}
</style>
```

## Example 2: Robust Post Reordering

This example demonstrates a more complete and realistic usage that matches the event payload dispatched by the drag-and-drop component. It shows proper database integration and more robust error handling.

### Livewire Component (ReorderablePosts.php)

```php
<?php

namespace App\Livewire;

use App\Models\Post;
use Livewire\Component;
use Livewire\Attributes\On;

class ReorderablePosts extends Component
{
    public $posts;

    public function mount(): void
    {
        $this->posts = Post::orderBy( 'position' )->get();
    }

    /**
     * Updates the order of posts after a drag-and-drop operation.
     *
     * @since 1.0.0
     *
     * @param array $payload The event payload from the drag-and-drop component.
     * Contains 'oldIndex', 'newIndex', etc.
     * @return void
     */
    #[On( 'drag:end' )]
    public function updateOrder( array $payload ): void
    {
        $postsArray = $this->posts->toArray();
        $movedItem  = array_splice( $postsArray, $payload['oldIndex'], 1 )[0];
        array_splice( $postsArray, $payload['newIndex'], 0, [$movedItem] );

        // Update the position for each post in the database.
        foreach ( $postsArray as $index => $post ) {
            Post::find( $post['id'] )->update( [ 'position' => $index ] );
        }

        // Refresh the component's data.
        $this->posts = collect( $postsArray );
    }

    public function render()
    {
        return view( 'livewire.reorderable-posts' );
    }
}
```

### Blade View (reorderable-posts.blade.php)

```blade
<div
    {{-- Pass the Livewire data to the context for accurate index tracking --}}
    x-drag-context="$wire.posts"
    class="space-y-2"
>
    @foreach ( $posts as $post )
        <div
            wire:key="post-{{ $post->id }}"
            x-drag-item
            class="p-4 bg-white border rounded-md shadow cursor-grab"
        >
            {{ $post->title }}
        </div>
    @endforeach
</div>
```

## Example 3: Advanced Kanban Board

This example demonstrates a sophisticated kanban board with multiple columns and cross-column drag-and-drop functionality.

### Livewire Component (KanbanBoard.php)

```php
<?php

declare( strict_types=1 );

namespace App\Livewire;

use Illuminate\Contracts\View\View;
use Livewire\Attributes\On;
use Livewire\Component;

/**
 * Kanban Board Component
 *
 * An advanced kanban board component with multiple columns and cross-column
 * drag-and-drop functionality. Demonstrates complex state management and
 * accessibility features.
 *
 * @since 1.0.0
 */
class KanbanBoard extends Component
{
    /**
     * Kanban board columns with their tasks.
     *
     * @since 1.0.0
     * @var array<string, array<string, mixed>>
     */
    public array $columns = [
        'todo' => [
            'title' => 'To Do',
            'color' => 'blue',
            'tasks' => [
                [ 'id' => 1, 'title' => 'Design new homepage', 'priority' => 'high', 'assignee' => 'John Doe' ],
                [ 'id' => 2, 'title' => 'Write API documentation', 'priority' => 'medium', 'assignee' => 'Jane Smith' ],
                [ 'id' => 3, 'title' => 'Setup CI/CD pipeline', 'priority' => 'high', 'assignee' => 'Mike Johnson' ],
            ],
        ],
        'progress' => [
            'title' => 'In Progress',
            'color' => 'yellow',
            'tasks' => [
                [ 'id' => 4, 'title' => 'Implement user authentication', 'priority' => 'high', 'assignee' => 'Sarah Wilson' ],
                [ 'id' => 5, 'title' => 'Create dashboard mockups', 'priority' => 'medium', 'assignee' => 'John Doe' ],
            ],
        ],
        'review' => [
            'title' => 'Review',
            'color' => 'purple',
            'tasks' => [
                [ 'id' => 6, 'title' => 'Test payment integration', 'priority' => 'high', 'assignee' => 'Mike Johnson' ],
            ],
        ],
        'done' => [
            'title' => 'Done',
            'color' => 'green',
            'tasks' => [
                [ 'id' => 7, 'title' => 'Setup development environment', 'priority' => 'low', 'assignee' => 'Jane Smith' ],
                [ 'id' => 8, 'title' => 'Create project wireframes', 'priority' => 'medium', 'assignee' => 'Sarah Wilson' ],
            ],
        ],
    ];

    /**
     * Handle task reordering within the same column.
     *
     * @since 1.0.0
     *
     * @param string $columnId The column identifier.
     * @param int    $oldIndex The original position of the task.
     * @param int    $newIndex The new position of the task.
     * @return void
     */
    #[On('reorder-tasks')]
    public function reorderTasks( string $columnId, int $oldIndex, int $newIndex ): void
    {
        if ( ! isset( $this->columns[ $columnId ] ) ) {
            return;
        }

        $tasks = $this->columns[ $columnId ]['tasks'];

        // Validate indices
        if ( $oldIndex < 0 || $oldIndex >= count( $tasks ) || $newIndex < 0 || $newIndex >= count( $tasks ) ) {
            return;
        }

        // Remove task from old position
        $task = array_splice( $tasks, $oldIndex, 1 )[0];

        // Insert task at new position
        array_splice( $tasks, $newIndex, 0, [ $task ] );

        // Update the column tasks
        $this->columns[ $columnId ]['tasks'] = array_values( $tasks );

        // Optional: Persist to database
        // $this->saveTaskOrder( $columnId, $this->columns[ $columnId ]['tasks'] );

        // Announce change for screen readers
        $this->dispatch( 'task-reordered', [
            'message' => sprintf(
                'Task "%s" moved from position %d to position %d in %s column',
                $task['title'],
                $oldIndex + 1,
                $newIndex + 1,
                $this->columns[ $columnId ]['title']
            ),
        ] );
    }

    /**
     * Handle task movement between columns.
     *
     * @since 1.0.0
     *
     * @param int    $taskId        The ID of the task being moved.
     * @param string $sourceColumn  The source column identifier.
     * @param string $targetColumn  The target column identifier.
     * @param int    $targetIndex   The target position within the target column.
     * @return void
     */
    #[On('move-task')]
    public function moveTask( int $taskId, string $sourceColumn, string $targetColumn, int $targetIndex ): void
    {
        // Validate columns exist
        if ( ! isset( $this->columns[ $sourceColumn ] ) || ! isset( $this->columns[ $targetColumn ] ) ) {
            return;
        }

        // Find and remove task from source column
        $sourceTasks = $this->columns[ $sourceColumn ]['tasks'];
        $taskIndex   = array_search( $taskId, array_column( $sourceTasks, 'id' ), true );

        if ( $taskIndex === false ) {
            return;
        }

        $task = array_splice( $sourceTasks, $taskIndex, 1 )[0];
        $this->columns[ $sourceColumn ]['tasks'] = array_values( $sourceTasks );

        // Add task to target column
        $targetTasks = $this->columns[ $targetColumn ]['tasks'];
        $targetIndex = max( 0, min( $targetIndex, count( $targetTasks ) ) );
        array_splice( $targetTasks, $targetIndex, 0, [ $task ] );
        $this->columns[ $targetColumn ]['tasks'] = array_values( $targetTasks );

        // Optional: Persist to database
        // $this->updateTaskColumn( $taskId, $targetColumn, $targetIndex );

        // Announce change for screen readers
        $this->dispatch( 'task-moved', [
            'message' => sprintf(
                'Task "%s" moved from %s to %s column',
                $task['title'],
                $this->columns[ $sourceColumn ]['title'],
                $this->columns[ $targetColumn ]['title']
            ),
        ] );
    }

    /**
     * Add a new task to a specific column.
     *
     * @since 1.0.0
     *
     * @param string $columnId The column identifier.
     * @param string $title    The task title.
     * @param string $priority The task priority.
     * @param string $assignee The task assignee.
     * @return void
     */
    public function addTask( string $columnId, string $title, string $priority = 'medium', string $assignee = '' ): void
    {
        if ( ! isset( $this->columns[ $columnId ] ) || empty( trim( $title ) ) ) {
            return;
        }

        // Generate new task ID
        $allTasks = [];
        foreach ( $this->columns as $column ) {
            $allTasks = array_merge( $allTasks, $column['tasks'] );
        }
        $newId = empty( $allTasks ) ? 1 : max( array_column( $allTasks, 'id' ) ) + 1;

        // Create new task
        $newTask = [
            'id'       => $newId,
            'title'    => trim( $title ),
            'priority' => $priority,
            'assignee' => trim( $assignee ),
        ];

        // Add to column
        $this->columns[ $columnId ]['tasks'][] = $newTask;

        // Optional: Persist to database
        // $this->saveTask( $newTask, $columnId );

        // Announce addition
        $this->dispatch( 'task-added', [
            'message' => sprintf(
                'New task "%s" added to %s column',
                $newTask['title'],
                $this->columns[ $columnId ]['title']
            ),
        ] );
    }

    /**
     * Remove a task from the board.
     *
     * @since 1.0.0
     *
     * @param int    $taskId   The task ID.
     * @param string $columnId The column identifier.
     * @return void
     */
    public function removeTask( int $taskId, string $columnId ): void
    {
        if ( ! isset( $this->columns[ $columnId ] ) ) {
            return;
        }

        $tasks     = $this->columns[ $columnId ]['tasks'];
        $taskIndex = array_search( $taskId, array_column( $tasks, 'id' ), true );

        if ( $taskIndex !== false ) {
            $task = $tasks[ $taskIndex ];
            unset( $tasks[ $taskIndex ] );
            $this->columns[ $columnId ]['tasks'] = array_values( $tasks );

            // Optional: Remove from database
            // $this->deleteTask( $taskId );

            // Announce removal
            $this->dispatch( 'task-removed', [
                'message' => sprintf(
                    'Task "%s" removed from %s column',
                    $task['title'],
                    $this->columns[ $columnId ]['title']
                ),
            ] );
        }
    }

    /**
     * Update a task's details.
     *
     * @since 1.0.0
     *
     * @param int    $taskId   The task ID.
     * @param string $columnId The column identifier.
     * @param array  $updates  The fields to update.
     * @return void
     */
    public function updateTask( int $taskId, string $columnId, array $updates ): void
    {
        if ( ! isset( $this->columns[ $columnId ] ) ) {
            return;
        }

        $tasks     = &$this->columns[ $columnId ]['tasks'];
        $taskIndex = array_search( $taskId, array_column( $tasks, 'id' ), true );

        if ( $taskIndex !== false ) {
            foreach ( $updates as $field => $value ) {
                if ( in_array( $field, [ 'title', 'priority', 'assignee' ], true ) ) {
                    $tasks[ $taskIndex ][ $field ] = $value;
                }
            }

            // Optional: Persist to database
            // $this->saveTask( $tasks[ $taskIndex ], $columnId );
        }
    }

    /**
     * Get task count for a column.
     *
     * @since 1.0.0
     *
     * @param string $columnId The column identifier.
     * @return int The number of tasks in the column.
     */
    public function getTaskCount( string $columnId ): int
    {
        return isset( $this->columns[ $columnId ] ) ? count( $this->columns[ $columnId ]['tasks'] ) : 0;
    }

    /**
     * Get total task count across all columns.
     *
     * @since 1.0.0
     *
     * @return int The total number of tasks.
     */
    public function getTotalTaskCount(): int
    {
        $total = 0;
        foreach ( $this->columns as $column ) {
            $total += count( $column['tasks'] );
        }
        return $total;
    }

    /**
     * Render the component.
     *
     * @since 1.0.0
     *
     * @return View The component view.
     */
    public function render(): View
    {
        return view( 'livewire.kanban-board' );
    }
}
```

### Blade View (resources/views/livewire/kanban-board.blade.php)

```blade
{{--
/**
 * Kanban Board Component View
 *
 * Advanced kanban board with multiple columns and cross-column drag-and-drop.
 * Features sophisticated task management and accessibility support.
 * Follows ArtisanPack UI styling conventions and WordPress Documentation Standards.
 *
 * @since 1.0.0
 */
--}}

<div class="kanban-board-container">
    {{-- Board Header --}}
    <div class="kanban-board-header">
        <h2 class="kanban-board-title">
            {{ __( 'Project Kanban Board' ) }}
        </h2>
        <div class="kanban-board-stats">
            <span class="kanban-stat">
                {{ __( 'Total Tasks: :count', [ 'count' => $this->getTotalTaskCount() ] ) }}
            </span>
        </div>
        <p class="kanban-board-description">
            {{ __( 'Drag tasks between columns to update their status. Use keyboard navigation for accessibility.' ) }}
        </p>
    </div>

    {{-- Kanban Columns --}}
    <div class="kanban-columns-container">
        @foreach ( $columns as $columnId => $column )
            <div class="kanban-column" data-column="{{ $columnId }}">
                {{-- Column Header --}}
                <div class="kanban-column-header kanban-column-header--{{ $column['color'] }}">
                    <h3 class="kanban-column-title">
                        {{ $column['title'] }}
                        <span class="kanban-column-count">{{ count( $column['tasks'] ) }}</span>
                    </h3>
                    
                    {{-- Add Task Button --}}
                    <button 
                        type="button"
                        x-data
                        @click="$dispatch('open-add-task-modal', { columnId: '{{ $columnId }}' })"
                        class="kanban-add-task-btn"
                        aria-label="{{ __( 'Add new task to :column', [ 'column' => $column['title'] ] ) }}"
                    >
                        <svg class="kanban-add-icon" aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M12 4v16m8-8H4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>

                {{-- Tasks Container --}}
                <div 
                    x-data="{
                        handleReorder: function(event) {
                            const { oldIndex, newIndex } = event.detail;
                            if (oldIndex !== newIndex) {
                                $wire.reorderTasks('{{ $columnId }}', oldIndex, newIndex);
                            }
                        },
                        handleCrossColumnDrop: function(event) {
                            const draggedData = JSON.parse(event.dataTransfer.getData('text/plain'));
                            const sourceColumn = draggedData.sourceColumn;
                            const taskId = draggedData.taskId;
                            
                            if (sourceColumn !== '{{ $columnId }}') {
                                // Calculate target index based on drop position
                                const tasks = Array.from(event.currentTarget.querySelectorAll('[x-drag-item]'));
                                const dropY = event.clientY;
                                let targetIndex = tasks.length;
                                
                                for (let i = 0; i < tasks.length; i++) {
                                    const rect = tasks[i].getBoundingClientRect();
                                    if (dropY < rect.top + rect.height / 2) {
                                        targetIndex = i;
                                        break;
                                    }
                                }
                                
                                $wire.moveTask(taskId, sourceColumn, '{{ $columnId }}', targetIndex);
                            }
                        }
                    }"
                    x-drag-context="handleReorder($event.detail)"
                    @drag:end="handleReorder($event)"
                    @dragover.prevent="$event.dataTransfer.dropEffect = 'move'"
                    @drop="handleCrossColumnDrop($event)"
                    class="kanban-tasks-container"
                    role="list"
                    aria-label="{{ __( 'Tasks in :column column', [ 'column' => $column['title'] ] ) }}"
                >
                    @forelse ( $column['tasks'] as $index => $task )
                        <div
                            x-drag-item="{{ json_encode( [ 
                                'taskId' => $task['id'], 
                                'index' => $index, 
                                'title' => $task['title'],
                                'sourceColumn' => $columnId
                            ] ) }}"
                            @dragstart="$event.dataTransfer.setData('text/plain', JSON.stringify({
                                taskId: {{ $task['id'] }},
                                sourceColumn: '{{ $columnId }}',
                                title: '{{ addslashes( $task['title'] ) }}'
                            }))"
                            class="kanban-task-card kanban-task-card--{{ $task['priority'] }}"
                            role="listitem"
                            aria-describedby="task-{{ $task['id'] }}-details"
                        >
                            {{-- Task Header --}}
                            <div class="kanban-task-header">
                                {{-- Drag Handle --}}
                                <div class="kanban-task-drag-handle" aria-hidden="true">
                                    <svg class="drag-handle-icon" viewBox="0 0 24 24">
                                        <path d="M10 4h4v2h-4V4zm0 7h4v2h-4v-2zm0 7h4v2h-4v-2z" fill="currentColor"/>
                                    </svg>
                                </div>

                                {{-- Priority Badge --}}
                                <span class="kanban-task-priority kanban-task-priority--{{ $task['priority'] }}">
                                    {{ ucfirst( $task['priority'] ) }}
                                </span>

                                {{-- Task Actions Dropdown --}}
                                <div class="kanban-task-actions" x-data="{ open: false }">
                                    <button 
                                        @click="open = !open"
                                        @click.away="open = false"
                                        class="kanban-task-menu-btn"
                                        aria-expanded="false"
                                        :aria-expanded="open"
                                        aria-label="{{ __( 'Task actions for :title', [ 'title' => $task['title'] ] ) }}"
                                    >
                                        <svg class="kanban-menu-icon" viewBox="0 0 24 24">
                                            <path d="M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" stroke-width="2"/>
                                        </svg>
                                    </button>

                                    <div 
                                        x-show="open"
                                        x-transition:enter="transition ease-out duration-100"
                                        x-transition:enter-start="transform opacity-0 scale-95"
                                        x-transition:enter-end="transform opacity-100 scale-100"
                                        x-transition:leave="transition ease-in duration-75"
                                        x-transition:leave-start="transform opacity-100 scale-100"
                                        x-transition:leave-end="transform opacity-0 scale-95"
                                        class="kanban-task-menu"
                                        x-cloak
                                    >
                                        <button 
                                            @click="$dispatch('edit-task', { taskId: {{ $task['id'] }}, columnId: '{{ $columnId }}' }); open = false"
                                            class="kanban-menu-item"
                                        >
                                            {{ __( 'Edit Task' ) }}
                                        </button>
                                        <button 
                                            @click="$wire.removeTask({{ $task['id'] }}, '{{ $columnId }}'); open = false"
                                            class="kanban-menu-item kanban-menu-item--danger"
                                        >
                                            {{ __( 'Delete Task' ) }}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {{-- Task Content --}}
                            <div class="kanban-task-content">
                                <h4 class="kanban-task-title" id="task-{{ $task['id'] }}-details">
                                    {{ $task['title'] }}
                                </h4>
                                
                                @if ( ! empty( $task['assignee'] ) )
                                    <div class="kanban-task-assignee">
                                        <span class="kanban-assignee-label">{{ __( 'Assigned to:' ) }}</span>
                                        <span class="kanban-assignee-name">{{ $task['assignee'] }}</span>
                                    </div>
                                @endif
                            </div>

                            {{-- Screen Reader Instructions --}}
                            <div class="sr-only">
                                {{ __( 'Priority: :priority. Use Space or Enter to grab, arrow keys to move within column, or drag to other columns. Space or Enter to drop, Escape to cancel.', [ 'priority' => $task['priority'] ] ) }}
                            </div>
                        </div>
                    @empty
                        <div class="kanban-empty-column">
                            <p class="kanban-empty-message">
                                {{ __( 'No tasks in :column yet', [ 'column' => $column['title'] ] ) }}
                            </p>
                            <button 
                                type="button"
                                x-data
                                @click="$dispatch('open-add-task-modal', { columnId: '{{ $columnId }}' })"
                                class="kanban-empty-add-btn"
                            >
                                {{ __( 'Add First Task' ) }}
                            </button>
                        </div>
                    @endforelse
                </div>
            </div>
        @endforeach
    </div>

    {{-- Live Region for Announcements --}}
    <div 
        x-data
        @task-reordered.window="$el.textContent = $event.detail.message"
        @task-moved.window="$el.textContent = $event.detail.message"
        @task-added.window="$el.textContent = $event.detail.message"
        @task-removed.window="$el.textContent = $event.detail.message"
        class="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
    ></div>
</div>

{{-- Component Styles --}}
<style>
.kanban-board-container {
    padding: 1.5rem;
    background: #f8fafc;
    min-height: 100vh;
}

.kanban-board-header {
    margin-bottom: 2rem;
    text-align: center;
}

.kanban-board-title {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
}

.kanban-board-stats {
    margin-bottom: 0.75rem;
}

.kanban-stat {
    background: #e5e7eb;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #4b5563;
}

.kanban-board-description {
    color: #6b7280;
    font-size: 0.875rem;
    max-width: 600px;
    margin: 0 auto;
    line-height: 1.5;
}

.kanban-columns-container {
    display: flex;
    gap: 1.5rem;
    overflow-x: auto;
    padding-bottom: 1rem;
}

.kanban-column {
    flex: 0 0 300px;
    background: #ffffff;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    max-height: 80vh;
}

.kanban-column-header {
    padding: 1rem;
    border-radius: 0.5rem 0.5rem 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.kanban-column-header--blue { background: #dbeafe; }
.kanban-column-header--yellow { background: #fef3c7; }
.kanban-column-header--purple { background: #ede9fe; }
.kanban-column-header--green { background: #d1fae5; }

.kanban-column-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.kanban-column-count {
    background: rgba(255, 255, 255, 0.8);
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}

.kanban-add-task-btn {
    padding: 0.375rem;
    background: rgba(255, 255, 255, 0.8);
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
}

.kanban-add-task-btn:hover {
    background: rgba(255, 255, 255, 1);
    transform: scale(1.05);
}

.kanban-add-icon {
    width: 1rem;
    height: 1rem;
    color: #4b5563;
}

.kanban-tasks-container {
    flex: 1;
    padding: 0.75rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.kanban-task-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    padding: 1rem;
    cursor: grab;
    transition: all 0.15s ease-in-out;
    border-left: 4px solid;
}

.kanban-task-card--high { border-left-color: #ef4444; }
.kanban-task-card--medium { border-left-color: #f59e0b; }
.kanban-task-card--low { border-left-color: #10b981; }

.kanban-task-card:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
}

.kanban-task-card:focus-within {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
}

.kanban-task-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
}

.kanban-task-drag-handle {
    color: #9ca3af;
    cursor: grab;
}

.kanban-task-priority {
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
}

.kanban-task-priority--high {
    background: #fef2f2;
    color: #dc2626;
}

.kanban-task-priority--medium {
    background: #fffbeb;
    color: #d97706;
}

.kanban-task-priority--low {
    background: #ecfdf5;
    color: #059669;
}

.kanban-task-actions {
    position: relative;
}

.kanban-task-menu-btn {
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 0.25rem;
}

.kanban-task-menu-btn:hover {
    background: #f3f4f6;
    color: #374151;
}

.kanban-menu-icon {
    width: 1rem;
    height: 1rem;
}

.kanban-task-menu {
    position: absolute;
    right: 0;
    top: 100%;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 50;
    min-width: 120px;
}

.kanban-menu-item {
    display: block;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    text-align: left;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s ease-in-out;
}

.kanban-menu-item:hover {
    background: #f3f4f6;
}

.kanban-menu-item--danger {
    color: #ef4444;
}

.kanban-menu-item--danger:hover {
    background: #fef2f2;
}

.kanban-task-content {
    margin-bottom: 0.5rem;
}

.kanban-task-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    line-height: 1.4;
    margin-bottom: 0.5rem;
    word-wrap: break-word;
}

.kanban-task-assignee {
    font-size: 0.75rem;
    color: #6b7280;
}

.kanban-assignee-label {
    font-weight: 500;
}

.kanban-assignee-name {
    color: #374151;
}

.kanban-empty-column {
    padding: 2rem 1rem;
    text-align: center;
    color: #6b7280;
}

.kanban-empty-message {
    font-style: italic;
    margin-bottom: 1rem;
}

.kanban-empty-add-btn {
    background: #f3f4f6;
    border: 2px dashed #d1d5db;
    border-radius: 0.375rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    color: #4b5563;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
}

.kanban-empty-add-btn:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
}

.drag-handle-icon {
    width: 1rem;
    height: 1rem;
}

@media (max-width: 768px) {
    .kanban-columns-container {
        flex-direction: column;
    }
    
    .kanban-column {
        flex: none;
        max-height: 400px;
    }
}
</style>
```

## API Reference

### Alpine.js Directives

#### `x-drag-context`

Creates a drag-and-drop context for a group of related items.

**Usage:**
```html
<div x-drag-context="handleDrop($event)" class="drag-container">
    <!-- draggable items -->
</div>
```

**Parameters:**
- `expression`: JavaScript expression to handle drop events
- Receives `$event.detail` with: `{ group, oldIndex, newIndex, sourceElement, targetElement }`

**Accessibility Features:**
- Adds `role="application"` and `aria-label="Drag and drop interface"`
- Creates persistent `aria-live` region for screen reader announcements
- Supports keyboard navigation with Escape key to cancel operations

#### `x-drag-item`

Designates an element as draggable within a drag context.

**Usage:**
```html
<div x-drag-item="{ id: 1, text: 'Item 1' }" class="drag-item">
    Item content
</div>
```

**Parameters:**
- `expression`: Data object associated with the draggable item

**Accessibility Features:**
- Adds `role="button"`, `aria-grabbed="false"`, and `draggable="true"`
- Supports full keyboard navigation:
  - Space/Enter: Grab/release item
  - Arrow keys: Move item within container
  - Escape: Cancel drag operation
- Provides screen reader instructions and announcements

### Events

#### `drag:end`

Fired when a drag operation completes successfully.

**Event Detail:**
```javascript
{
    orderedIds: []  // Array of item IDs in their new order
}
```

**Usage:**
```javascript
document.addEventListener('drag:end', (event) => {
    const { orderedIds } = event.detail;
    // Handle reorder logic with the new order array
    $wire.reorderItems(orderedIds);
});
```

## Accessibility

This package is built with **WCAG 2.1 AA compliance** as a core principle:

### Screen Reader Support
- **ARIA Live Regions**: Automatic announcements for drag operations
- **Semantic HTML**: Proper roles and labels for all interactive elements
- **Clear Instructions**: Built-in guidance for keyboard users

### Keyboard Navigation
- **Space/Enter**: Grab and release items
- **Arrow Keys**: Move items within containers
- **Escape**: Cancel drag operations
- **Tab**: Navigate between draggable items

### Visual Indicators
- **Focus Outlines**: Clear visual focus indicators
- **Drag States**: Visual feedback during drag operations
- **High Contrast**: Supports high contrast mode

### Testing
Tested with:
- **NVDA** (Windows)
- **JAWS** (Windows) 
- **VoiceOver** (macOS/iOS)
- **TalkBack** (Android)

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| iOS Safari | 14+ | ✅ Full |
| Chrome Android | 90+ | ✅ Full |

### Required Features
- **Drag and Drop API**: All modern browsers
- **Alpine.js 3.x**: Required dependency
- **ES6 Modules**: For optimal performance

## Version 2.0.0 Migration Guide

### Breaking Changes

Version 2.0.0 introduces significant architectural improvements while maintaining the same public API (`x-drag-context` and `x-drag-item` directives). However, there are important changes to be aware of:

#### Event Structure Changes

**Old (v1.0.0):**
```javascript
document.addEventListener('drag:end', (event) => {
    const { group, oldIndex, newIndex, sourceElement, targetElement } = event.detail;
    // Handle with index-based logic
});
```

**New (v2.0.0):**
```javascript
document.addEventListener('drag:end', (event) => {
    const { orderedIds } = event.detail;
    // Handle with complete ordered array
    $wire.reorderItems(orderedIds);
});
```

#### Architectural Improvements

- **Stateless Event Delegation**: The new architecture uses a global, stateless event delegation pattern that's immune to Livewire's DOM morphing
- **Race Condition Fixes**: Resolved fundamental race conditions between Livewire's `message.processed` hook and Alpine.js's `initTree` function
- **Automatic Rehydration**: New `forceRehydrateDraggableItems` function ensures all items remain draggable after Livewire updates
- **Improved Stability**: Draggable items no longer become unresponsive after Livewire updates

#### Migration Steps

1. **Update Event Handlers**: Replace `oldIndex/newIndex` logic with `orderedIds` array handling
2. **Backend Updates**: Modify your Livewire component methods to accept the complete ordered array:

```php
#[On('drag:end')]
public function reorderItems(array $orderedIds): void
{
    // Update your data structure with the new order
    $this->items = collect($orderedIds)
        ->map(fn($id) => $this->items->firstWhere('id', $id))
        ->filter()
        ->values()
        ->toArray();
}
```

3. **CSS Classes**: The `.is-grabbing` class behavior remains the same, no changes needed
4. **No Directive Changes**: `x-drag-context` and `x-drag-item` usage remains identical

### New Features in 2.0.0

#### Automatic Rehydration Function

The new `forceRehydrateDraggableItems` function automatically ensures all draggable items maintain their functionality after Livewire updates. This function is called automatically by the package, but advanced users can access it if needed:

```javascript
// Available globally after package initialization
// Called automatically after every Livewire update
forceRehydrateDraggableItems(containerElement);
```

#### Enhanced Livewire Integration

Version 2.0.0 provides seamless integration with Livewire's DOM morphing through improved hooks:

- **`morph.updating` Hook**: Temporarily ignores recently moved items during morphing
- **`message.processed` Hook**: Automatically reinitializes contexts and rehydrates items
- **Global State Management**: Maintains drag state across Livewire updates

## Advanced Usage

### Custom Event Handling

```javascript
// Multiple event listeners
document.addEventListener('drag:end', (event) => {
    const { orderedIds } = event.detail;
    
    // Handle reorder logic with the complete ordered array
    $wire.reorderItems(orderedIds);
});
```

### Cross-Container Drag and Drop

```blade
{{-- Source Container --}}
<div x-drag-context="group='source'" class="source-container">
    <div x-drag-item="{ id: 1, type: 'task' }">Task 1</div>
</div>

{{-- Target Container --}}
<div 
    x-drag-context="group='target'"
    @dragover.prevent
    @drop="handleCrossContainerDrop($event)"
    class="target-container"
>
    <!-- Drop zone -->
</div>
```

### Custom Styling

```css
/* Custom drag states */
.my-drag-item {
    transition: all 0.2s ease;
}

.my-drag-item.is-grabbing {
    background: #e3f2fd;
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
    transform: rotate(2deg) scale(1.05);
}

/* Custom focus styles */
.my-drag-item:focus {
    outline: 3px solid #2196f3;
    outline-offset: 2px;
}
```

## Laravel Integration

### Service Provider Registration

```php
// config/app.php
'providers' => [
    // Other providers...
    App\Providers\DragDropServiceProvider::class,
],
```

### Middleware for Drag Operations

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ValidateDragOperation
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->has(['oldIndex', 'newIndex'])) {
            $request->validate([
                'oldIndex' => 'required|integer|min:0',
                'newIndex' => 'required|integer|min:0',
            ]);
        }

        return $next($request);
    }
}
```

## Performance Optimization

### Lazy Loading

```blade
<div 
    x-data="{ loaded: false }"
    x-intersect="loaded = true"
>
    <template x-if="loaded">
        <div x-drag-context="handleDrop">
            <!-- Heavy drag content -->
        </div>
    </template>
</div>
```

### Debounced Updates

```javascript
// Debounce frequent reorder operations
const debouncedReorder = debounce((oldIndex, newIndex) => {
    $wire.reorderItems(oldIndex, newIndex);
}, 300);
```

## Troubleshooting

### Common Issues

**Drag not working:**
- Ensure Alpine.js is loaded before the drag-and-drop plugin
- Check that `x-drag-context` wraps `x-drag-item` elements
- Verify CSS doesn't prevent pointer events

**Accessibility issues:**
- Add `sr-only` class styles to your CSS
- Ensure proper color contrast ratios
- Test with actual screen readers

**Mobile touch problems:**
- Add `touch-action: none` to draggable elements
- Test on actual devices, not just browser dev tools

### Debug Mode

```javascript
// Enable debug logging
document.addEventListener('drag:end', (event) => {
    console.log('Drag operation:', event.detail);
});
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](docs/contributing.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://gitlab.com/jacob-martella-web-design/artisanpack-ui/livewire-drag-and-drop.git
cd livewire-drag-and-drop

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test
```

### Code Standards

- Follow [ArtisanPack UI Coding Standards](docs/coding-standards.md)
- Use [WordPress Documentation Standards](https://developer.wordpress.org/coding-standards/inline-documentation-standards/)
- Ensure WCAG 2.1 AA compliance
- Add comprehensive JSDoc comments

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and breaking changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 **Documentation**: [docs/](docs/)
- 🐛 **Bug Reports**: [GitLab Issues](https://gitlab.com/jacob-martella-web-design/artisanpack-ui/livewire-drag-and-drop/issues)
- 💬 **Community**: [ArtisanPack UI Discussions](https://gitlab.com/jacob-martella-web-design/artisanpack-ui/livewire-drag-and-drop/-/wikis/home)
- 📧 **Email**: support@artisanpack-ui.com

## Credits

Created by [Jacob Martella](https://gitlab.com/jacob-martella-web-design) for the ArtisanPack UI ecosystem.

Built with:
- [Alpine.js](https://alpinejs.dev/) - Reactive JavaScript framework
- [Livewire](https://laravel-livewire.com/) - Laravel full-stack framework
- [Vite](https://vitejs.dev/) - Build tool and dev server

---

**ArtisanPack UI** - Crafting accessible, beautiful interfaces for the modern web.
