<?php

namespace App\Http\Controllers;

use App\Models\ChannelCategory;
use App\Models\Server;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function store(Request $request, Server $server)
    {
        $this->authorize('manageChannels', $server);

        $data = $request->validate(['name' => 'required|string|max:100']);

        $position = $server->categories()->max('position') + 1;
        $category = $server->categories()->create([
            'name'     => $data['name'],
            'position' => $position,
        ]);

        return response()->json($category);
    }

    public function update(Request $request, ChannelCategory $category)
    {
        $this->authorize('manageChannels', $category->server);

        $data = $request->validate(['name' => 'required|string|max:100']);
        $category->update($data);

        return response()->json($category);
    }

    public function destroy(ChannelCategory $category)
    {
        $this->authorize('manageChannels', $category->server);
        $category->delete(); // channels go to category_id = null via nullOnDelete

        return response()->noContent();
    }
}
