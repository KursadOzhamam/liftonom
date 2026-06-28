<?php
// app/Http/Controllers/Api/ProductController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\StockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $q = Product::query()->with('supplier:id,name');
        if ($search = $request->string('search')->trim()->value()) {
            $q->where(fn ($w) => $w->where('name', 'ilike', "%{$search}%")
                ->orWhere('code', 'ilike', "%{$search}%")
                ->orWhere('category', 'ilike', "%{$search}%"));
        }
        if ($request->boolean('low_stock')) {
            $q->whereColumn('stock_quantity', '<', 'min_stock');
        }

        return $q->orderBy('name')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supplier_id'    => ['nullable', 'integer', 'exists:suppliers,id'],
            'code'           => ['nullable', 'string', 'max:100'],
            'name'           => ['required', 'string', 'max:255'],
            'category'       => ['nullable', 'string', 'max:100'],
            'unit'           => ['nullable', 'string', 'max:20'],
            'stock_quantity' => ['nullable', 'numeric'],
            'min_stock'      => ['nullable', 'numeric'],
            'unit_price'     => ['nullable', 'numeric'],
        ]);

        return response()->json(Product::create($data)->fresh(), 201);
    }

    public function show(Product $product)
    {
        return $product->load('supplier:id,name');
    }

    public function update(Request $request, Product $product)
    {
        $product->update($request->validate([
            'supplier_id' => ['nullable', 'integer', 'exists:suppliers,id'],
            'name'        => ['sometimes', 'string', 'max:255'],
            'category'    => ['nullable', 'string', 'max:100'],
            'unit'        => ['nullable', 'string', 'max:20'],
            'min_stock'   => ['nullable', 'numeric'],
            'unit_price'  => ['nullable', 'numeric'],
        ]));

        return $product->fresh();
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(['message' => 'Ürün silindi.']);
    }

    public function stockIn(Request $request, Product $product)
    {
        return $this->move($request, $product, 'in');
    }

    public function stockOut(Request $request, Product $product)
    {
        return $this->move($request, $product, 'out');
    }

    public function lowStock()
    {
        return Product::whereColumn('stock_quantity', '<', 'min_stock')
            ->orderBy('name')->get();
    }

    public function movements(Request $request)
    {
        $q = StockMovement::query();
        if ($request->filled('product_id')) {
            $q->where('product_id', $request->integer('product_id'));
        }

        return $q->orderByDesc('id')->paginate(min((int) $request->integer('per_page', 25), 100));
    }

    private function move(Request $request, Product $product, string $type)
    {
        $data = $request->validate([
            'quantity'   => ['required', 'numeric', 'min:0.01'],
            'unit_price' => ['nullable', 'numeric'],
            'note'       => ['nullable', 'string'],
        ]);

        return DB::transaction(function () use ($product, $type, $data, $request) {
            $product = Product::lockForUpdate()->find($product->id);
            $qty = (float) $data['quantity'];

            if ($type === 'out' && (float) $product->stock_quantity < $qty) {
                abort(422, 'Yeterli stok yok.');
            }

            $product->stock_quantity = (float) $product->stock_quantity + ($type === 'in' ? $qty : -$qty);
            $product->save();

            StockMovement::create([
                'product_id'  => $product->id,
                'type'        => $type,
                'quantity'    => $qty,
                'unit_price'  => $data['unit_price'] ?? $product->unit_price,
                'total_price' => $qty * (float) ($data['unit_price'] ?? $product->unit_price),
                'reference_type' => $type === 'in' ? 'purchase' : 'adjustment',
                'note'        => $data['note'] ?? null,
                'created_by'  => $request->user()->id,
                'created_at'  => now(),
            ]);

            return response()->json([
                'message' => 'Stok güncellendi.',
                'stock_quantity' => $product->stock_quantity,
            ]);
        });
    }
}
